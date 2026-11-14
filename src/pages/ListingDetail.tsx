import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { useToast } from '../lib/toastContext';
import { Listing, PublicProfile, LockedDay, Booking } from '../domain/types';
import { formatINR, calculateInclusiveDays, calculateAgreedTotal, generateDateRangeList } from '../domain/rules';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { db } from '../lib/firebase';
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Shield,
  MapPin,
  Clock,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const ListingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser, signInWithGoogle } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [listing, setListing] = useState<Listing | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<PublicProfile | null>(null);
  const [lockedDays, setLockedDays] = useState<Record<string, LockedDay>>({});
  const [ownerReviewsCount, setOwnerReviewsCount] = useState<number>(0);
  const [ownerCompletedCount, setOwnerCompletedCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Request Form States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [borrowerMessage, setBorrowerMessage] = useState('');
  const [wouldHaveBought, setWouldHaveBought] = useState<'yes' | 'no' | 'maybe'>('no');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Collapsed disclosure sections
  const [showCancellationPolicy, setShowCancellationPolicy] = useState(false);
  const [showBorrowVsBuyModal, setShowBorrowVsBuyModal] = useState(false);

  // Active photo gallery
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  useEffect(() => {
    if (!id) return;

    async function loadListingAndOwner() {
      try {
        setLoading(true);
        const listingDoc = await getDoc(doc(db, 'listings', id!));
        if (!listingDoc.exists()) {
          showToast({ type: 'danger', message: 'Listing not found.' });
          navigate('/browse');
          return;
        }

        const lData = { id: listingDoc.id, ...listingDoc.data() } as Listing;
        setListing(lData);

        // Fetch owner public profile
        const ownerDoc = await getDoc(doc(db, 'publicProfiles', lData.ownerId));
        if (ownerDoc.exists()) {
          setOwnerProfile(ownerDoc.data() as PublicProfile);
        }

        // Fetch locked & blocked days
        const locksSnap = await getDocs(collection(db, 'listings', id!, 'lockedDays'));
        const lMap: Record<string, LockedDay> = {};
        locksSnap.forEach((d) => {
          lMap[d.id] = { id: d.id, ...d.data() } as LockedDay;
        });
        setLockedDays(lMap);

        // Fetch owner's trust indicators from public activity / completed bookings
        const ownerBookingsSnap = await getDocs(
          query(
            collection(db, 'bookings'),
            where('ownerId', '==', lData.ownerId),
            where('status', '==', 'completed')
          )
        );
        setOwnerCompletedCount(ownerBookingsSnap.size);

        const reviewsSnap = await getDocs(
          query(collection(db, 'reviews'), where('revieweeId', '==', lData.ownerId))
        );
        setOwnerReviewsCount(reviewsSnap.size);
      } catch (err) {
        console.warn('Error loading listing details:', err);
      } finally {
        setLoading(false);
      }
    }

    loadListingAndOwner();
  }, [id, navigate, showToast]);

  const daysCount = calculateInclusiveDays(startDate, endDate);
  const agreedTotal = listing
    ? calculateAgreedTotal(listing.pricePerDay, daysCount, listing.transactionType)
    : 0;

  // Check if requested date range has any locked / blocked days
  const requestedDates = generateDateRangeList(startDate, endDate);
  const hasOverlapWithLocked = requestedDates.some((d) => lockedDays[d] !== undefined);

  // Handle Date Selection from calendar grid
  const handleCalendarDayClick = (dateStr: string) => {
    if (lockedDays[dateStr]) {
      showToast({ type: 'warning', message: 'This date is already booked or blocked by the owner.' });
      return;
    }

    if (!startDate || (startDate && endDate)) {
      setStartDate(dateStr);
      setEndDate('');
    } else if (startDate && !endDate) {
      if (dateStr < startDate) {
        setStartDate(dateStr);
        setEndDate('');
      } else {
        // Validate min / max days
        const span = calculateInclusiveDays(startDate, dateStr);
        if (listing && span > listing.maxDays) {
          showToast({ type: 'warning', message: `Maximum rental duration is ${listing.maxDays} days.` });
          return;
        }
        setEndDate(dateStr);
      }
    }
  };

  const handleSendRequest = async () => {
    if (!currentUser) {
      signInWithGoogle();
      return;
    }
    if (!listing) return;
    if (currentUser.uid === listing.ownerId) {
      showToast({ type: 'warning', message: 'You cannot book your own listing.' });
      return;
    }
    if (!startDate || !endDate || daysCount <= 0) {
      showToast({ type: 'warning', message: 'Please select valid start and end dates.' });
      return;
    }
    if (hasOverlapWithLocked) {
      showToast({ type: 'danger', message: 'Selected date range contains unavailable dates.' });
      return;
    }

    setSubmittingRequest(true);
    try {
      const newBooking: Omit<Booking, 'id'> = {
        listingId: listing.id,
        ownerId: listing.ownerId,
        borrowerId: currentUser.uid,
        startDate,
        endDate,
        days: daysCount,
        transactionType: listing.transactionType,
        pricePerDayAtRequest: listing.pricePerDay || 0,
        agreedTotal,
        commissionPct: 0.08,
        status: 'pending',
        wouldHaveBought,
        borrowerMessage: borrowerMessage.trim() || undefined,
        listingSnapshot: {
          title: listing.title,
          image: listing.images[0] || '',
          category: listing.category,
          replacementValue: listing.replacementValue,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const bookingRef = await addDoc(collection(db, 'bookings'), newBooking);

      // Create status history event
      await addDoc(collection(db, 'bookings', bookingRef.id, 'statusHistory'), {
        fromStatus: null,
        toStatus: 'pending',
        actorUid: currentUser.uid,
        note: 'Request created by borrower',
        at: serverTimestamp(),
      });

      // Send in-app notification to owner
      await addDoc(collection(db, 'notifications'), {
        recipientId: listing.ownerId,
        title: 'New borrow request',
        message: `${currentUser.displayName || 'A neighbor'} requested "${listing.title}" for ${daysCount} day${daysCount > 1 ? 's' : ''}.`,
        link: `/requests`,
        type: 'booking',
        read: false,
        createdAt: serverTimestamp(),
      });

      setRequestSuccess(true);
      showToast({ type: 'success', message: 'Borrow request sent to owner!' });
    } catch (err: any) {
      console.error('Failed to submit booking request:', err);
      showToast({ type: 'danger', message: 'Failed to send request. Please try again.' });
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Generate 28-day interactive calendar
  const today = new Date();
  const calendarDays: string[] = [];
  for (let i = 0; i < 28; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    calendarDays.push(d.toISOString().split('T')[0]);
  }

  // Borrow vs Buy calculation values
  const purchaseCost = listing?.replacementValue || 20000;
  const rentalDaily = listing?.pricePerDay || 500;
  const breakEvenDays = Math.ceil(purchaseCost / (rentalDaily || 1));

  if (loading || !listing) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-am-ink-muted">
        <p className="text-sm">Loading listing details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-4 px-4 flex flex-col gap-8 text-left">
      {/* Back button */}
      <div>
        <Link
          to="/browse"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-am-ink-muted hover:text-am-ink transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Browse</span>
        </Link>
      </div>

      {/* Main Grid: Left Gallery & Details, Right Booking Request Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Photo Gallery */}
          <div className="flex flex-col gap-3">
            <div className="aspect-4/3 w-full rounded-am-card border border-am-border overflow-hidden bg-am-surface-2 relative shadow-am-soft">
              {listing.images.length > 0 ? (
                <img
                  src={listing.images[selectedPhotoIndex] || listing.images[0]}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-am-ink-muted text-sm">
                  No image available
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {listing.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {listing.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedPhotoIndex(idx)}
                    className={`w-16 h-16 rounded-am-input border overflow-hidden shrink-0 transition cursor-pointer ${
                      selectedPhotoIndex === idx
                        ? 'border-am-primary ring-2 ring-am-primary/30'
                        : 'border-am-border opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title & Metadata */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-am-ink-muted uppercase tracking-wider mb-2">
              <span>{listing.category}</span>
              <span>•</span>
              <span>{listing.condition}</span>
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-am-ink mb-3 leading-tight">
              {listing.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-am-ink-muted pb-4 border-b border-am-border">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-am-primary shrink-0" />
                {listing.locality || 'Sarjapur, Bengaluru'}
              </span>
              <span>•</span>
              <span>Replacement value: {formatINR(listing.replacementValue)}</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-am-ink-muted mb-2">
              About This Item
            </h3>
            <p className="text-sm text-am-ink leading-relaxed whitespace-pre-line">
              {listing.description || 'No detailed description provided by the owner.'}
            </p>
          </div>

          {/* Rules & Handover Notes */}
          {(listing.rules || listing.handover) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-am-card border border-am-border bg-am-surface">
              {listing.rules && (
                <div>
                  <h4 className="text-xs font-semibold text-am-ink mb-1">House Rules</h4>
                  <p className="text-xs text-am-ink-muted leading-relaxed">{listing.rules}</p>
                </div>
              )}
              {listing.handover && (
                <div>
                  <h4 className="text-xs font-semibold text-am-ink mb-1">Handover & Return</h4>
                  <p className="text-xs text-am-ink-muted leading-relaxed">{listing.handover}</p>
                </div>
              )}
            </div>
          )}

          {/* Owner Community Trust Profile */}
          <div className="p-4 rounded-am-card border border-am-border bg-am-surface shadow-am-soft">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-am-ink-muted mb-3">
              Shared By Neighbor
            </h3>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full border border-am-border bg-am-surface-2 flex items-center justify-center font-heading font-semibold text-am-primary text-base overflow-hidden">
                {ownerProfile?.avatarUrl ? (
                  <img src={ownerProfile.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  (ownerProfile?.displayName || 'O').charAt(0).toUpperCase()
                )}
              </div>

              <div>
                <h4 className="font-semibold text-am-ink text-sm">
                  {ownerProfile?.displayName || 'Community Member'}
                </h4>
                <p className="text-xs text-am-ink-muted">
                  {ownerProfile?.locality || 'Neighborhood cluster'}
                </p>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-3 border-t border-am-border">
              <div className="p-2 rounded-am-input bg-am-surface-2">
                <span className="block text-[10px] uppercase font-semibold text-am-ink-muted">Exchanges</span>
                <span className="font-semibold text-am-ink">{ownerCompletedCount}</span>
              </div>
              <div className="p-2 rounded-am-input bg-am-surface-2">
                <span className="block text-[10px] uppercase font-semibold text-am-ink-muted">Reviews</span>
                <span className="font-semibold text-am-ink">{ownerReviewsCount}</span>
              </div>
              <div className="p-2 rounded-am-input bg-am-surface-2">
                <span className="block text-[10px] uppercase font-semibold text-am-ink-muted">Trust</span>
                <span className="font-semibold text-am-success">Verified</span>
              </div>
            </div>
          </div>

          {/* Borrow vs Buy trigger button */}
          {listing.transactionType === 'rent' && (
            <div className="p-4 rounded-am-card border border-am-border bg-am-sand/40 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-am-ink">Thinking of buying instead?</h4>
                <p className="text-xs text-am-ink-muted">
                  Compare total purchase cost vs renting for break-even analysis.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setShowBorrowVsBuyModal(true)}>
                Borrow vs Buy
              </Button>
            </div>
          )}
        </div>

        {/* Right Column: Request Card & Calendar (5 cols) */}
        <div className="lg:col-span-5 sticky top-20">
          <div className="p-5 rounded-am-card border border-am-border bg-am-surface shadow-am-soft flex flex-col gap-5">
            {/* Price Header */}
            <div className="flex items-baseline justify-between border-b border-am-border pb-4">
              <div>
                {listing.transactionType === 'rent' ? (
                  <span className="font-heading text-2xl font-semibold text-am-ink">
                    {formatINR(listing.pricePerDay)}{' '}
                    <span className="font-sans text-xs text-am-ink-muted font-normal">/ day</span>
                  </span>
                ) : (
                  <span className="font-heading text-xl font-semibold text-am-primary uppercase tracking-wider">
                    {listing.transactionType}
                  </span>
                )}
              </div>
              <span className="text-xs text-am-ink-muted">
                Min: {listing.minDays}d • Max: {listing.maxDays}d
              </span>
            </div>

            {requestSuccess ? (
              <div className="py-6 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-am-success/15 text-am-success flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-am-ink mb-1">
                  Request Sent!
                </h3>
                <p className="text-xs text-am-ink-muted mb-4 max-w-xs">
                  The owner has been notified. Once approved, the dates will be locked on their calendar.
                </p>
                <Link to="/requests" className="w-full">
                  <Button variant="primary" size="md" className="w-full">
                    View My Requests
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {/* Calendar Date Picker */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-am-ink-muted flex items-center gap-1">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span>Select Dates (Next 4 Weeks)</span>
                    </label>
                    {startDate && (
                      <button
                        onClick={() => {
                          setStartDate('');
                          setEndDate('');
                        }}
                        className="text-[11px] text-am-danger hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 mb-2">
                    {calendarDays.map((dStr) => {
                      const isLocked = lockedDays[dStr] !== undefined;
                      const isSelected =
                        dStr === startDate ||
                        dStr === endDate ||
                        (startDate && endDate && dStr > startDate && dStr < endDate);
                      const isBoundary = dStr === startDate || dStr === endDate;

                      const dateObj = new Date(dStr + 'T00:00:00Z');
                      const dayNum = dateObj.getUTCDate();
                      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'narrow' });

                      return (
                        <button
                          key={dStr}
                          type="button"
                          disabled={isLocked}
                          onClick={() => handleCalendarDayClick(dStr)}
                          className={`h-11 rounded-am-input text-xs flex flex-col items-center justify-center transition cursor-pointer ${
                            isLocked
                              ? 'bg-am-surface-2 text-am-ink-muted/40 cursor-not-allowed line-through'
                              : isBoundary
                              ? 'bg-am-primary text-am-on-primary font-bold shadow-xs'
                              : isSelected
                              ? 'bg-am-sand text-am-ink font-semibold'
                              : 'bg-am-surface border border-am-border text-am-ink hover:border-am-primary'
                          }`}
                        >
                          <span className="text-[8px] opacity-70 uppercase">{dayName}</span>
                          <span className="text-[11px]">{dayNum}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-xs text-am-ink-muted">
                    <span>
                      {startDate ? (
                        <span>
                          <strong>{startDate}</strong> to{' '}
                          <strong>{endDate || '...'}</strong>
                        </span>
                      ) : (
                        'Tap start date then end date'
                      )}
                    </span>
                    {daysCount > 0 && (
                      <span className="font-semibold text-am-ink">
                        {daysCount} day{daysCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Question: Would you otherwise have bought this item? */}
                <div className="p-3 rounded-am-input bg-am-surface-2/60 border border-am-border text-left">
                  <label className="text-xs font-semibold text-am-ink block mb-1.5">
                    Would you otherwise have bought this item?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 'yes', label: 'Yes' },
                      { val: 'maybe', label: 'Maybe' },
                      { val: 'no', label: 'No' },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setWouldHaveBought(opt.val as any)}
                        className={`py-1.5 rounded-am-input text-xs font-medium border transition cursor-pointer ${
                          wouldHaveBought === opt.val
                            ? 'bg-am-primary text-white border-am-primary font-semibold'
                            : 'bg-am-surface text-am-ink border-am-border hover:bg-am-surface-2'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-am-ink-muted mt-1 block">
                    Helps compute upper-bound estimated savings on your Impact Scorecard.
                  </span>
                </div>

                {/* Optional Message */}
                <Textarea
                  label="Message to Owner (Optional)"
                  placeholder="Introduce yourself and explain what you plan to use it for."
                  value={borrowerMessage}
                  onChange={(e) => setBorrowerMessage(e.target.value)}
                  rows={2}
                />

                {/* Price Breakdown */}
                {daysCount > 0 && (
                  <div className="p-3 rounded-am-input bg-am-surface-2 border border-am-border flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between text-am-ink-muted">
                      <span>
                        {formatINR(listing.pricePerDay)} × {daysCount} days
                      </span>
                      <span>{formatINR(agreedTotal)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-am-ink pt-1.5 border-t border-am-border/60 text-sm">
                      <span>Recorded Total</span>
                      <span>{formatINR(agreedTotal)}</span>
                    </div>
                  </div>
                )}

                {/* Mandatory Direct-Payment Notice */}
                <div className="p-3 rounded-am-input bg-am-surface-2/50 border border-am-border text-[11px] text-am-ink-muted leading-relaxed">
                  Payments are arranged directly between users. AlmostMine does not process payments, verify identity, or insure items.
                </div>

                {/* Collapsible Cancellation Policy */}
                <div className="border border-am-border rounded-am-input overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowCancellationPolicy(!showCancellationPolicy)}
                    className="w-full px-3 py-2 text-xs font-semibold text-am-ink flex items-center justify-between bg-am-surface hover:bg-am-surface-2 transition cursor-pointer"
                  >
                    <span>Cancellation Policy</span>
                    {showCancellationPolicy ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {showCancellationPolicy && (
                    <div className="p-3 bg-am-surface-2/40 text-[11px] text-am-ink-muted border-t border-am-border leading-relaxed">
                      Borrowers may cancel pending requests anytime. Approved bookings can be cancelled with no consequence up to 48 hours before the start date. Cancellations made within 48 hours are recorded as late cancellations on your Community Trust Profile.
                    </div>
                  )}
                </div>

                {/* Primary Action Button */}
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={!startDate || !endDate || daysCount <= 0 || hasOverlapWithLocked}
                  loading={submittingRequest}
                  onClick={handleSendRequest}
                >
                  {currentUser ? 'Send Request' : 'Sign in to Request'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Borrow vs Buy Modal */}
      <Modal
        isOpen={showBorrowVsBuyModal}
        onClose={() => setShowBorrowVsBuyModal(false)}
        title="Borrow vs. Buy Calculator"
        description="Clear economics of renting versus outright ownership"
      >
        <div className="flex flex-col gap-4 text-left py-2 text-sm">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-am-input bg-am-surface-2 border border-am-border">
              <span className="text-am-ink-muted block text-[10px] uppercase font-semibold">New Purchase</span>
              <span className="font-semibold text-am-ink text-base">{formatINR(purchaseCost)}</span>
            </div>
            <div className="p-3 rounded-am-input bg-am-surface-2 border border-am-border">
              <span className="text-am-ink-muted block text-[10px] uppercase font-semibold">Rent Per Day</span>
              <span className="font-semibold text-am-primary text-base">{formatINR(rentalDaily)}</span>
            </div>
          </div>

          <div className="p-4 rounded-am-card border border-am-border bg-am-surface shadow-am-soft">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-am-ink mb-1">
              Break-Even Analysis
            </h4>
            <p className="text-xs text-am-ink-muted leading-relaxed mb-2">
              It would take <strong>{breakEvenDays} rental days</strong> for cumulative rental fees to equal the new purchase price.
            </p>
            <p className="text-xs text-am-ink font-medium">
              {breakEvenDays > 14
                ? 'Verdict: If you need this gear fewer than 14 days this year, borrowing is significantly cheaper and avoids clutter.'
                : 'Verdict: If you use this daily, purchasing may be justified over time.'}
            </p>
          </div>

          <Button variant="secondary" size="md" onClick={() => setShowBorrowVsBuyModal(false)}>
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
};
