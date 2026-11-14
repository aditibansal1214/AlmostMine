import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { useToast } from '../lib/toastContext';
import { Booking, PublicProfile, LockedDay } from '../domain/types';
import { formatINR, generateDateRangeList, isLateCancellation } from '../domain/rules';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { db } from '../lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  runTransaction,
  serverTimestamp,
  addDoc,
  getDoc,
} from 'firebase/firestore';
import {
  Inbox,
  Check,
  X,
  AlertCircle,
  Clock,
  Calendar,
  User,
  Shield,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Repeat,
} from 'lucide-react';

export const Requests: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'asked_of_me' | 'i_asked'>('asked_of_me');
  const [askedOfMeBookings, setAskedOfMeBookings] = useState<Booking[]>([]);
  const [iAskedBookings, setIAskedBookings] = useState<Booking[]>([]);
  const [borrowerProfiles, setBorrowerProfiles] = useState<Record<string, PublicProfile>>({});
  const [loading, setLoading] = useState(true);

  // Expanded profile section map
  const [expandedProfiles, setExpandedProfiles] = useState<Record<string, boolean>>({});

  // Review modal state
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchRequests = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);

      // 1. Asked of me (as owner)
      const askedOfMeQ = query(
        collection(db, 'bookings'),
        where('ownerId', '==', currentUser.uid)
      );
      const askedOfMeSnap = await getDocs(askedOfMeQ);
      const ownerBookings = askedOfMeSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
      ownerBookings.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setAskedOfMeBookings(ownerBookings);

      // 2. I asked (as borrower)
      const iAskedQ = query(
        collection(db, 'bookings'),
        where('borrowerId', '==', currentUser.uid)
      );
      const iAskedSnap = await getDocs(iAskedQ);
      const borrowerBookings = iAskedSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
      borrowerBookings.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setIAskedBookings(borrowerBookings);

      // Fetch public profiles of borrowers
      const borrowerUids = Array.from(new Set(ownerBookings.map((b) => b.borrowerId)));
      const pMap: Record<string, PublicProfile> = {};
      await Promise.all(
        borrowerUids.map(async (uid) => {
          const uDoc = await getDoc(doc(db, 'publicProfiles', uid));
          if (uDoc.exists()) {
            pMap[uid] = uDoc.data() as PublicProfile;
          }
        })
      );
      setBorrowerProfiles(pMap);
    } catch (err) {
      console.warn('Error loading requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentUser]);

  // OWNER ACTION: Approve Request (with atomic calendar locking)
  const handleApprove = async (booking: Booking) => {
    if (!currentUser || currentUser.uid !== booking.ownerId) return;

    try {
      const datesToLock = generateDateRangeList(booking.startDate, booking.endDate);

      await runTransaction(db, async (txn) => {
        // 1. Verify that NO lock document exists for any day in the range
        for (const dateStr of datesToLock) {
          const lockRef = doc(db, 'listings', booking.listingId, 'lockedDays', dateStr);
          const lockSnap = await txn.get(lockRef);
          if (lockSnap.exists()) {
            throw new Error(`Date ${dateStr} is already locked for another booking or owner block.`);
          }
        }

        // 2. Write lock documents for each day in the same transaction
        for (const dateStr of datesToLock) {
          const lockRef = doc(db, 'listings', booking.listingId, 'lockedDays', dateStr);
          txn.set(lockRef, {
            date: dateStr,
            type: 'booking',
            bookingId: booking.id,
            ownerId: currentUser.uid,
            createdAt: serverTimestamp(),
          });
        }

        // 3. Update booking status to approved
        const bookingRef = doc(db, 'bookings', booking.id);
        txn.update(bookingRef, {
          status: 'approved',
          approvedAt: serverTimestamp(),
          respondedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // 4. Record statusHistory event
        const historyRef = doc(collection(db, 'bookings', booking.id, 'statusHistory'));
        txn.set(historyRef, {
          fromStatus: 'pending',
          toStatus: 'approved',
          actorUid: currentUser.uid,
          at: serverTimestamp(),
        });

        // 5. Create in-app notification for borrower
        const notifRef = doc(collection(db, 'notifications'));
        txn.set(notifRef, {
          recipientId: booking.borrowerId,
          title: 'Request Approved!',
          message: `Your request for "${booking.listingSnapshot?.title}" was approved. View handover checklist.`,
          link: `/booking/${booking.id}`,
          type: 'booking',
          read: false,
          createdAt: serverTimestamp(),
        });
      });

      showToast({ type: 'success', message: 'Booking approved and calendar dates locked!' });
      fetchRequests();
    } catch (err: any) {
      console.error('Approval failed:', err);
      showToast({
        type: 'danger',
        message: err.message || 'Could not approve request due to date conflict.',
      });
    }
  };

  // OWNER ACTION: Decline Request
  const handleDecline = async (booking: Booking) => {
    if (!currentUser || currentUser.uid !== booking.ownerId) return;

    try {
      await runTransaction(db, async (txn) => {
        const bookingRef = doc(db, 'bookings', booking.id);
        txn.update(bookingRef, {
          status: 'rejected',
          respondedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const historyRef = doc(collection(db, 'bookings', booking.id, 'statusHistory'));
        txn.set(historyRef, {
          fromStatus: 'pending',
          toStatus: 'rejected',
          actorUid: currentUser.uid,
          at: serverTimestamp(),
        });

        const notifRef = doc(collection(db, 'notifications'));
        txn.set(notifRef, {
          recipientId: booking.borrowerId,
          title: 'Request Declined',
          message: `Your request for "${booking.listingSnapshot?.title}" could not be accommodated.`,
          link: `/browse`,
          type: 'booking',
          read: false,
          createdAt: serverTimestamp(),
        });
      });

      showToast({ type: 'info', message: 'Request declined.' });
      fetchRequests();
    } catch (err: any) {
      console.error('Decline error:', err);
      showToast({ type: 'danger', message: 'Failed to decline request.' });
    }
  };

  // CANCEL ACTION (Borrower or Owner)
  const handleCancel = async (booking: Booking) => {
    if (!currentUser) return;
    const isOwner = currentUser.uid === booking.ownerId;
    const isLate = isLateCancellation(booking.startDate);

    try {
      const datesToUnlock =
        booking.status === 'approved'
          ? generateDateRangeList(booking.startDate, booking.endDate)
          : [];

      await runTransaction(db, async (txn) => {
        // If approved, release locked days in same transaction
        for (const dateStr of datesToUnlock) {
          const lockRef = doc(db, 'listings', booking.listingId, 'lockedDays', dateStr);
          txn.delete(lockRef);
        }

        const bookingRef = doc(db, 'bookings', booking.id);
        txn.update(bookingRef, {
          status: 'cancelled',
          cancelledBy: currentUser.uid,
          lateCancellation: isLate,
          updatedAt: serverTimestamp(),
        });

        const historyRef = doc(collection(db, 'bookings', booking.id, 'statusHistory'));
        txn.set(historyRef, {
          fromStatus: booking.status,
          toStatus: 'cancelled',
          actorUid: currentUser.uid,
          note: isLate ? 'Late cancellation under 48 hours' : 'Cancelled',
          at: serverTimestamp(),
        });

        // Notify other party
        const otherUid = isOwner ? booking.borrowerId : booking.ownerId;
        const notifRef = doc(collection(db, 'notifications'));
        txn.set(notifRef, {
          recipientId: otherUid,
          title: 'Booking Cancelled',
          message: `Booking for "${booking.listingSnapshot?.title}" was cancelled.`,
          link: `/requests`,
          type: 'booking',
          read: false,
          createdAt: serverTimestamp(),
        });
      });

      showToast({
        type: 'info',
        message: isLate
          ? 'Booking cancelled. Note: Cancellations under 48h are recorded as late.'
          : 'Booking cancelled.',
      });
      fetchRequests();
    } catch (err: any) {
      console.error('Cancellation failed:', err);
      showToast({ type: 'danger', message: 'Failed to cancel booking.' });
    }
  };

  // SUBMIT REVIEW
  const handleSubmitReview = async () => {
    if (!currentUser || !reviewBooking) return;
    const revieweeId =
      currentUser.uid === reviewBooking.ownerId
        ? reviewBooking.borrowerId
        : reviewBooking.ownerId;

    try {
      setSubmittingReview(true);
      const reviewDocId = `${reviewBooking.id}_${currentUser.uid}`;
      const reviewRef = doc(db, 'reviews', reviewDocId);

      await runTransaction(db, async (txn) => {
        txn.set(reviewRef, {
          bookingId: reviewBooking.id,
          reviewerId: currentUser.uid,
          revieweeId,
          rating: Number(reviewRating),
          text: reviewText.trim(),
          createdAt: serverTimestamp(),
        });
      });

      showToast({ type: 'success', message: 'Review recorded! Thank you for building trust.' });
      setReviewBooking(null);
      setReviewText('');
    } catch (err) {
      console.error('Error submitting review:', err);
      showToast({ type: 'danger', message: 'Failed to record review.' });
    } finally {
      setSubmittingReview(false);
    }
  };

  const statusBadge = (status: Booking['status']) => {
    const map = {
      pending: 'bg-am-warning/15 text-am-warning border-am-warning/30',
      approved: 'bg-am-primary text-am-on-primary',
      rejected: 'bg-am-danger/15 text-am-danger border-am-danger/30',
      cancelled: 'bg-am-surface-2 text-am-ink-muted border-am-border',
      completed: 'bg-am-success/15 text-am-success border-am-success/30',
    };
    return (
      <span
        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
          map[status] || map.pending
        }`}
      >
        {status}
      </span>
    );
  };

  const currentList = activeTab === 'asked_of_me' ? askedOfMeBookings : iAskedBookings;

  return (
    <div className="flex flex-col gap-6 md:gap-8 text-left max-w-4xl mx-auto">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-semibold text-am-ink">
          Requests & Bookings
        </h1>
        <p className="text-sm text-am-ink-muted">
          Manage exchange requests and review handover steps
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-am-border">
        <button
          onClick={() => setActiveTab('asked_of_me')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'asked_of_me'
              ? 'border-am-primary text-am-primary'
              : 'border-transparent text-am-ink-muted hover:text-am-ink'
          }`}
        >
          <span>Asked of me</span>
          {askedOfMeBookings.filter((b) => b.status === 'pending').length > 0 && (
            <span className="w-5 h-5 rounded-full bg-am-warning text-white text-[10px] flex items-center justify-center font-bold">
              {askedOfMeBookings.filter((b) => b.status === 'pending').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('i_asked')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'i_asked'
              ? 'border-am-primary text-am-primary'
              : 'border-transparent text-am-ink-muted hover:text-am-ink'
          }`}
        >
          <span>I asked</span>
          {iAskedBookings.length > 0 && (
            <span className="text-xs text-am-ink-muted font-normal">
              ({iAskedBookings.length})
            </span>
          )}
        </button>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 rounded-am-card bg-am-surface-2 animate-pulse" />
          ))}
        </div>
      ) : currentList.length > 0 ? (
        <div className="flex flex-col gap-4">
          {currentList.map((booking) => {
            const borrower = borrowerProfiles[booking.borrowerId];
            const isOwner = currentUser?.uid === booking.ownerId;
            const isProfileExpanded = expandedProfiles[booking.id];

            return (
              <div
                key={booking.id}
                className="p-5 rounded-am-card border border-am-border bg-am-surface shadow-am-soft flex flex-col gap-4"
              >
                {/* Header Row: Listing Title, Dates & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-am-border pb-3">
                  <div className="flex items-center gap-3">
                    {booking.listingSnapshot?.image && (
                      <img
                        src={booking.listingSnapshot.image}
                        alt=""
                        className="w-12 h-12 rounded-am-input object-cover border border-am-border shrink-0"
                      />
                    )}
                    <div>
                      <h3 className="font-semibold text-base text-am-ink">
                        {booking.listingSnapshot?.title || 'Item'}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-am-ink-muted">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {booking.startDate} to {booking.endDate} ({booking.days} days)
                        </span>
                        <span>•</span>
                        <span className="font-medium text-am-ink">
                          {booking.agreedTotal > 0 ? formatINR(booking.agreedTotal) : 'Free Lend'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {statusBadge(booking.status)}
                  </div>
                </div>

                {/* Borrower Message */}
                {booking.borrowerMessage && (
                  <div className="p-3 rounded-am-input bg-am-surface-2/60 border border-am-border text-xs flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-am-ink-muted shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-am-ink block">Borrower note:</span>
                      <p className="text-am-ink-muted mt-0.5 italic">"{booking.borrowerMessage}"</p>
                    </div>
                  </div>
                )}

                {/* Owner view: Collapsible Community Trust Profile */}
                {isOwner && borrower && (
                  <div className="border border-am-border rounded-am-input overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedProfiles((prev) => ({
                          ...prev,
                          [booking.id]: !prev[booking.id],
                        }))
                      }
                      className="w-full px-3 py-2 flex items-center justify-between bg-am-surface-2/40 hover:bg-am-surface-2 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-am-primary" />
                        <span className="font-semibold text-am-ink">
                          Requester Trust Profile: {borrower.displayName}
                        </span>
                      </div>
                      {isProfileExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isProfileExpanded && (
                      <div className="p-3 bg-am-surface border-t border-am-border flex flex-col gap-2">
                        <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                          <div className="p-1.5 rounded-am-input bg-am-surface-2">
                            <span className="text-am-ink-muted block text-[9px] uppercase font-semibold">Community</span>
                            <span className="font-medium text-am-ink">{borrower.locality || 'Nearby'}</span>
                          </div>
                          <div className="p-1.5 rounded-am-input bg-am-surface-2">
                            <span className="text-am-ink-muted block text-[9px] uppercase font-semibold">Interests</span>
                            <span className="font-medium text-am-ink">{borrower.interests?.length || 0} shared</span>
                          </div>
                          <div className="p-1.5 rounded-am-input bg-am-surface-2">
                            <span className="text-am-ink-muted block text-[9px] uppercase font-semibold">Status</span>
                            <span className="font-medium text-am-success">Verified</span>
                          </div>
                        </div>
                        {borrower.bio && (
                          <p className="text-am-ink-muted italic text-[11px]">"{borrower.bio}"</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Next Single Action per Card */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-[11px] text-am-ink-muted">
                    {booking.status === 'pending' &&
                      (isOwner ? 'Review and decide on requested dates.' : 'Awaiting owner review.')}
                    {booking.status === 'approved' &&
                      'Dates reserved. View checklist for handover and return.'}
                    {booking.status === 'completed' &&
                      'Exchange completed safely.'}
                    {booking.status === 'cancelled' &&
                      'This booking was cancelled.'}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Owner Actions for Pending */}
                    {isOwner && booking.status === 'pending' && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<X className="w-3.5 h-3.5" />}
                          onClick={() => handleDecline(booking)}
                        >
                          Decline
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Check className="w-3.5 h-3.5" />}
                          onClick={() => handleApprove(booking)}
                        >
                          Approve Dates
                        </Button>
                      </>
                    )}

                    {/* Borrower Cancel Action */}
                    {!isOwner && booking.status === 'pending' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCancel(booking)}
                      >
                        Cancel Request
                      </Button>
                    )}

                    {/* Approved actions: View Handover Checklist */}
                    {booking.status === 'approved' && (
                      <div className="flex items-center gap-2">
                        <Link to={`/booking/${booking.id}`}>
                          <Button variant="primary" size="sm">
                            Handover & Return Checklist
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancel(booking)}
                          className="text-am-danger hover:text-am-danger"
                        >
                          Cancel
                        </Button>
                      </div>
                    )}

                    {/* Completed actions: Leave Review */}
                    {booking.status === 'completed' && (
                      <div className="flex items-center gap-2">
                        <Link to={`/booking/${booking.id}`}>
                          <Button variant="secondary" size="sm">
                            View details
                          </Button>
                        </Link>
                        <Button
                          variant="sand"
                          size="sm"
                          onClick={() => {
                            setReviewBooking(booking);
                            setReviewRating(5);
                            setReviewText('');
                          }}
                        >
                          Leave Review
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Inbox className="w-8 h-8" />}
          title={activeTab === 'asked_of_me' ? 'No incoming requests yet' : 'No requests placed'}
          description={
            activeTab === 'asked_of_me'
              ? 'When neighbors in your community request to borrow your gear, their requests will appear here.'
              : 'Browse community items to request cameras, tools, or luggage for your next project or trip.'
          }
          actionLabel={activeTab === 'asked_of_me' ? 'List an item' : 'Browse items'}
          onAction={() =>
            (window.location.href = activeTab === 'asked_of_me' ? '/items/new' : '/browse')
          }
        />
      )}

      {/* Review Dialog */}
      {reviewBooking && (
        <Modal
          isOpen={true}
          onClose={() => setReviewBooking(null)}
          title="Leave a Trust Review"
          description={`Share honest feedback on your exchange for "${reviewBooking.listingSnapshot?.title}"`}
        >
          <div className="flex flex-col gap-4 text-left py-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-am-ink-muted block mb-1.5">
                Rating (1 to 5 Stars)
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className={`w-10 h-10 rounded-am-input border text-sm font-bold flex items-center justify-center transition cursor-pointer ${
                      reviewRating >= star
                        ? 'bg-am-primary text-white border-am-primary'
                        : 'bg-am-surface border-am-border text-am-ink-muted'
                    }`}
                  >
                    ★ {star}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-am-ink-muted block mb-1.5">
                Review Comments (Max 500 characters)
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Was the item in great condition? Was handover punctual and smooth?"
                className="w-full bg-am-surface text-am-ink text-sm p-3 rounded-am-input border border-am-border focus:outline-none focus:ring-1 focus:ring-am-primary"
              />
              <span className="text-[10px] text-am-ink-muted">{reviewText.length}/500</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button variant="secondary" size="md" onClick={() => setReviewBooking(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSubmitReview}
                loading={submittingReview}
              >
                Submit Review
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
