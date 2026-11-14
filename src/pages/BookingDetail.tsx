import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { useToast } from '../lib/toastContext';
import { Booking, ChecklistItem, Listing } from '../domain/types';
import { getDefaultChecklistForCategory, formatINR } from '../domain/rules';
import { Button } from '../components/ui/Button';
import { db } from '../lib/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  writeBatch,
  addDoc,
} from 'firebase/firestore';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Shield,
  Calendar,
  Sparkles,
  MapPin,
  FileCheck,
} from 'lucide-react';

export const BookingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingChecklist, setUpdatingChecklist] = useState(false);
  const [completingBooking, setCompletingBooking] = useState(false);
  const [requestingAiChecklist, setRequestingAiChecklist] = useState(false);

  useEffect(() => {
    if (!id || !currentUser) return;

    async function loadBooking() {
      try {
        setLoading(true);
        const bDoc = await getDoc(doc(db, 'bookings', id!));
        if (!bDoc.exists()) {
          showToast({ type: 'danger', message: 'Booking not found.' });
          navigate('/requests');
          return;
        }

        const bData = { id: bDoc.id, ...bDoc.data() } as Booking;
        // Verify user is either owner or borrower
        if (currentUser!.uid !== bData.ownerId && currentUser!.uid !== bData.borrowerId) {
          showToast({ type: 'danger', message: 'Access denied to this booking.' });
          navigate('/requests');
          return;
        }

        setBooking(bData);

        // Fetch associated listing for handover notes
        const lDoc = await getDoc(doc(db, 'listings', bData.listingId));
        if (lDoc.exists()) {
          setListing({ id: lDoc.id, ...lDoc.data() } as Listing);
        }

        // Initialize checklist items if not already saved
        if (bData.checklist?.items && bData.checklist.items.length > 0) {
          setChecklistItems(bData.checklist.items);
        } else {
          const category = bData.listingSnapshot?.category || 'Other';
          const defaultTemplates = getDefaultChecklistForCategory(category);
          const initialItems: ChecklistItem[] = defaultTemplates.map((text, idx) => ({
            id: `chk_${idx}`,
            label: text,
            checkedByOwner: false,
            checkedByBorrower: false,
          }));
          setChecklistItems(initialItems);
        }
      } catch (err) {
        console.warn('Error loading booking:', err);
      } finally {
        setLoading(false);
      }
    }

    loadBooking();
  }, [id, currentUser, navigate, showToast]);

  const isOwner = currentUser?.uid === booking?.ownerId;
  const isBorrower = currentUser?.uid === booking?.borrowerId;

  // Toggle checklist item
  const handleToggleCheck = async (itemId: string) => {
    if (!booking || !id) return;

    const updated = checklistItems.map((item) => {
      if (item.id === itemId) {
        if (isOwner) {
          return { ...item, checkedByOwner: !item.checkedByOwner };
        } else {
          return { ...item, checkedByBorrower: !item.checkedByBorrower };
        }
      }
      return item;
    });

    setChecklistItems(updated);
    setUpdatingChecklist(true);

    try {
      const bookingRef = doc(db, 'bookings', id);
      await updateDoc(bookingRef, {
        checklist: {
          ...booking.checklist,
          items: updated,
        },
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Failed to save checklist state:', err);
      showToast({ type: 'danger', message: 'Could not sync checklist acknowledgment.' });
    } finally {
      setUpdatingChecklist(false);
    }
  };

  // Optional AI suggestions for extra inspection checklist items
  const handleGetAiChecklist = async () => {
    if (!booking) return;
    try {
      setRequestingAiChecklist(true);
      const res = await fetch('/api/ai/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: booking.listingSnapshot?.title,
          category: booking.listingSnapshot?.category,
          description: listing?.description,
        }),
      });

      if (!res.ok) throw new Error('AI service response error');
      const data = await res.json();
      if (data.items && Array.isArray(data.items)) {
        const newItems: ChecklistItem[] = data.items.map((lbl: string, idx: number) => ({
          id: `ai_${Date.now()}_${idx}`,
          label: lbl,
          checkedByOwner: false,
          checkedByBorrower: false,
        }));
        const merged = [...checklistItems, ...newItems];
        setChecklistItems(merged);

        const bookingRef = doc(db, 'bookings', id!);
        await updateDoc(bookingRef, {
          checklist: { ...booking.checklist, items: merged },
          updatedAt: serverTimestamp(),
        });
        showToast({ type: 'success', message: 'Added inspection recommendations.' });
      }
    } catch (err) {
      console.warn('AI checklist suggestion fallback notice:', err);
      showToast({ type: 'info', message: 'Standard category checklist is active.' });
    } finally {
      setRequestingAiChecklist(false);
    }
  };

  // OWNER: Mark Returned & Complete Booking
  const handleMarkReturned = async () => {
    if (!booking || !id || !isOwner) return;

    setCompletingBooking(true);
    try {
      const batch = writeBatch(db);

      // 1. Update booking doc to 'completed'
      const bookingRef = doc(db, 'bookings', id);
      batch.update(bookingRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. Append statusHistory event
      const historyRef = doc(collection(db, 'bookings', id, 'statusHistory'));
      batch.set(historyRef, {
        fromStatus: 'approved',
        toStatus: 'completed',
        actorUid: currentUser!.uid,
        note: 'Marked returned and completed by owner',
        at: serverTimestamp(),
      });

      // 3. Write immutable publicActivity ledger entry in the same batch
      const activityRef = doc(collection(db, 'publicActivity'));
      batch.set(activityRef, {
        type: 'booking_completed',
        subjectUid: currentUser!.uid,
        otherUid: booking.borrowerId,
        listingId: booking.listingId,
        category: booking.listingSnapshot?.category || 'Other',
        communityId: listing?.communityId || 'comm_greenfield',
        bookingId: booking.id,
        at: serverTimestamp(),
      });

      // 4. Notify borrower
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        recipientId: booking.borrowerId,
        title: 'Exchange Completed!',
        message: `Your rental for "${booking.listingSnapshot?.title}" has been marked returned. Please leave a review.`,
        link: `/requests`,
        type: 'review',
        read: false,
        createdAt: serverTimestamp(),
      });

      await batch.commit();

      showToast({ type: 'success', message: 'Item marked returned and exchange completed!' });
      setBooking((prev) => (prev ? { ...prev, status: 'completed' } : null));
    } catch (err) {
      console.error('Failed to mark returned:', err);
      showToast({ type: 'danger', message: 'Failed to complete exchange.' });
    } finally {
      setCompletingBooking(false);
    }
  };

  if (loading || !booking) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-am-ink-muted">
        <p className="text-sm">Loading booking handover steps...</p>
      </div>
    );
  }

  // Simple Timeline stages
  const timelineStages = [
    { key: 'requested', label: 'Requested', done: true },
    {
      key: 'approved',
      label: 'Approved',
      done: booking.status === 'approved' || booking.status === 'completed',
    },
    {
      key: 'handover',
      label: 'Handover Check',
      done: checklistItems.some((i) => i.checkedByOwner || i.checkedByBorrower),
    },
    {
      key: 'return',
      label: 'Returned & Completed',
      done: booking.status === 'completed',
    },
  ];

  return (
    <div className="max-w-3xl mx-auto py-4 px-4 flex flex-col gap-6 text-left">
      <Link
        to="/requests"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-am-ink-muted hover:text-am-ink transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Requests</span>
      </Link>

      {/* Item Summary Header */}
      <div className="p-5 rounded-am-card border border-am-border bg-am-surface shadow-am-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {booking.listingSnapshot?.image && (
            <img
              src={booking.listingSnapshot.image}
              alt=""
              className="w-14 h-14 rounded-am-input object-cover border border-am-border shrink-0"
            />
          )}
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-am-primary block">
              {booking.listingSnapshot?.category}
            </span>
            <h1 className="font-heading text-lg font-semibold text-am-ink">
              {booking.listingSnapshot?.title}
            </h1>
            <p className="text-xs text-am-ink-muted">
              {booking.startDate} to {booking.endDate} • {booking.days} days •{' '}
              {booking.agreedTotal > 0 ? formatINR(booking.agreedTotal) : 'Free Lend'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider border ${
              booking.status === 'completed'
                ? 'bg-am-success/15 text-am-success border-am-success/30'
                : 'bg-am-primary text-white border-am-primary'
            }`}
          >
            {booking.status}
          </span>
        </div>
      </div>

      {/* Simple Timeline */}
      <section className="p-4 rounded-am-card border border-am-border bg-am-surface shadow-am-soft">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-am-ink-muted mb-4">
          Exchange Timeline
        </h3>
        <div className="flex items-center justify-between">
          {timelineStages.map((st, idx) => (
            <React.Fragment key={st.key}>
              <div className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition ${
                    st.done
                      ? 'bg-am-primary text-white'
                      : 'bg-am-surface-2 text-am-ink-muted border border-am-border'
                  }`}
                >
                  {st.done ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                <span
                  className={`text-[10px] sm:text-xs text-center font-medium ${
                    st.done ? 'text-am-ink font-semibold' : 'text-am-ink-muted'
                  }`}
                >
                  {st.label}
                </span>
              </div>
              {idx < timelineStages.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-1.5 -mt-4 transition ${
                    timelineStages[idx + 1].done ? 'bg-am-primary' : 'bg-am-border'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* Handover & Location Instructions */}
      {listing?.handover && (
        <div className="p-4 rounded-am-card border border-am-border bg-am-surface">
          <div className="flex items-center gap-2 mb-2 text-am-ink">
            <MapPin className="w-4 h-4 text-am-primary" />
            <h4 className="text-xs font-semibold uppercase tracking-wider">
              Handover & Pickup Instructions
            </h4>
          </div>
          <p className="text-sm text-am-ink leading-relaxed">{listing.handover}</p>
        </div>
      )}

      {/* Smart Exchange Checklist */}
      <section className="p-5 rounded-am-card border border-am-border bg-am-surface shadow-am-soft flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-am-border pb-3">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-am-primary" />
            <div>
              <h3 className="font-heading text-base font-semibold text-am-ink">
                Smart Exchange Checklist
              </h3>
              <p className="text-xs text-am-ink-muted">
                Category verification for handover and return
              </p>
            </div>
          </div>

          {isOwner && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Sparkles className="w-3.5 h-3.5 text-am-accent" />}
              onClick={handleGetAiChecklist}
              loading={requestingAiChecklist}
            >
              Suggest extra checks
            </Button>
          )}
        </div>

        {/* Legal Disclaimer copy */}
        <p className="text-[11px] text-am-ink-muted italic bg-am-surface-2 p-2.5 rounded-am-input border border-am-border">
          A checklist records what both parties agreed. It does not independently prove an item's condition.
        </p>

        {/* Checklist items list */}
        <div className="flex flex-col gap-2.5">
          {checklistItems.map((item) => {
            const isCheckedByMe = isOwner ? item.checkedByOwner : item.checkedByBorrower;

            return (
              <div
                key={item.id}
                className="p-3 rounded-am-input border border-am-border bg-am-surface hover:bg-am-surface-2/40 transition flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={item.id}
                    checked={isCheckedByMe}
                    onChange={() => handleToggleCheck(item.id)}
                    className="w-4 h-4 rounded-xs accent-am-primary cursor-pointer shrink-0"
                  />
                  <label htmlFor={item.id} className="text-am-ink font-medium cursor-pointer">
                    {item.label}
                  </label>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-am-ink-muted shrink-0">
                  <span
                    className={`px-1.5 py-0.5 rounded-xs ${
                      item.checkedByOwner ? 'bg-am-sand text-am-ink font-semibold' : 'bg-am-surface-2'
                    }`}
                  >
                    Owner {item.checkedByOwner ? '✓' : '—'}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-xs ${
                      item.checkedByBorrower ? 'bg-am-sand text-am-ink font-semibold' : 'bg-am-surface-2'
                    }`}
                  >
                    Borrower {item.checkedByBorrower ? '✓' : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Direct Payment reminder */}
        <p className="text-[11px] text-am-ink-muted border-t border-am-border pt-3">
          Payments are arranged directly between users. AlmostMine does not process payments, verify identity, or insure items.
        </p>

        {/* Owner Mark Returned button */}
        {isOwner && booking.status === 'approved' && (
          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              loading={completingBooking}
              onClick={handleMarkReturned}
            >
              Mark Returned & Complete Exchange
            </Button>
            <span className="text-[10px] text-am-ink-muted block text-center mt-1.5">
              Updates community ledger and allows both parties to leave trust reviews.
            </span>
          </div>
        )}
      </section>
    </div>
  );
};
