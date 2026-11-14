import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { useToast } from '../lib/toastContext';
import { Listing, Booking, LockedDay } from '../domain/types';
import { Button } from '../components/ui/Button';
import { Input, Textarea, Select } from '../components/ui/Input';
import { CATEGORIES, CONDITIONS, formatINR } from '../domain/rules';
import { resizeImageToDataUrl } from '../lib/imageUtils';
import { db } from '../lib/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ArrowLeft,
  Check,
  Calendar as CalendarIcon,
  Upload,
  X,
  Lock,
  Pause,
  Play,
  Share2,
  Trash2,
  Repeat,
} from 'lucide-react';

export const ItemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lockedDays, setLockedDays] = useState<Record<string, LockedDay>>({});
  const [itemStats, setItemStats] = useState({
    requested: 0,
    borrowed: 0,
    returned: 0,
    reuseCount: 0,
  });

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!id || !currentUser) return;

    async function loadItem() {
      try {
        setLoading(true);
        const docRef = doc(db, 'listings', id!);
        const snap = await getDoc(docRef);

        if (!snap.exists()) {
          showToast({ type: 'danger', message: 'Item not found' });
          navigate('/items');
          return;
        }

        const data = { id: snap.id, ...snap.data() } as Listing;
        if (data.ownerId !== currentUser!.uid) {
          showToast({ type: 'danger', message: 'You do not have permission to edit this item.' });
          navigate(`/listing/${id}`);
          return;
        }

        setListing(data);

        // Fetch locked & blocked days
        const locksSnap = await getDocs(collection(db, 'listings', id!, 'lockedDays'));
        const locksMap: Record<string, LockedDay> = {};
        locksSnap.forEach((d) => {
          locksMap[d.id] = { id: d.id, ...d.data() } as LockedDay;
        });
        setLockedDays(locksMap);

        // Fetch bookings for this item to build Item Journey
        const bSnap = await getDocs(
          query(collection(db, 'bookings'), where('listingId', '==', id))
        );
        let requested = 0;
        let borrowed = 0;
        let returned = 0;

        bSnap.forEach((doc) => {
          const b = doc.data() as Booking;
          requested += 1;
          if (b.status === 'approved' || b.status === 'completed') {
            borrowed += 1;
          }
          if (b.status === 'completed') {
            returned += 1;
          }
        });

        setItemStats({
          requested,
          borrowed,
          returned,
          reuseCount: returned,
        });
      } catch (err) {
        console.warn('Error loading item:', err);
      } finally {
        setLoading(false);
      }
    }

    loadItem();
  }, [id, currentUser, navigate, showToast]);

  // Inline Auto-Save with debounce
  const triggerAutoSave = (updatedFields: Partial<Listing>) => {
    if (!listing || !id) return;
    setListing((prev) => (prev ? { ...prev, ...updatedFields } : null));
    setSaveStatus('saving');

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const itemRef = doc(db, 'listings', id);
        await updateDoc(itemRef, {
          ...updatedFields,
          updatedAt: serverTimestamp(),
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2500);
      } catch (err) {
        console.error('Failed to auto-save:', err);
        setSaveStatus('idle');
        showToast({ type: 'danger', message: 'Failed to auto-save change.' });
      }
    }, 700);
  };

  // Toggle Pause / Resume
  const handleTogglePause = async () => {
    if (!listing || !id) return;
    const newStatus = listing.status === 'paused' ? 'active' : 'paused';
    triggerAutoSave({ status: newStatus });
  };

  // Block / Unblock calendar dates
  const handleToggleDayLock = async (dateStr: string) => {
    if (!id || !currentUser) return;
    const existingLock = lockedDays[dateStr];

    if (existingLock && existingLock.type === 'booking') {
      showToast({ type: 'warning', message: 'This date is reserved for an approved booking and cannot be unblocked.' });
      return;
    }

    const lockRef = doc(db, 'listings', id, 'lockedDays', dateStr);

    try {
      if (existingLock) {
        // Unblock
        await deleteDoc(lockRef);
        setLockedDays((prev) => {
          const next = { ...prev };
          delete next[dateStr];
          return next;
        });
        showToast({ type: 'success', message: `Unblocked ${dateStr}` });
      } else {
        // Block
        const newLock: LockedDay = {
          date: dateStr,
          type: 'blocked',
          ownerId: currentUser.uid,
          createdAt: serverTimestamp(),
        };
        await setDoc(lockRef, newLock);
        setLockedDays((prev) => ({ ...prev, [dateStr]: newLock }));
        showToast({ type: 'info', message: `Blocked ${dateStr}` });
      }
    } catch (err) {
      console.error('Error toggling date lock:', err);
      showToast({ type: 'danger', message: 'Failed to update calendar date lock.' });
    }
  };

  // Upload additional photo
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !listing) return;
    if (listing.images.length + files.length > 5) {
      showToast({ type: 'warning', message: 'Max 5 photos allowed.' });
      return;
    }
    try {
      const newImages = [...listing.images];
      for (let i = 0; i < files.length; i++) {
        const resized = await resizeImageToDataUrl(files[i]);
        newImages.push(resized);
      }
      triggerAutoSave({ images: newImages });
    } catch (err: any) {
      showToast({ type: 'danger', message: err.message || 'Photo upload failed.' });
    } finally {
      e.target.value = '';
    }
  };

  const removePhoto = (index: number) => {
    if (!listing) return;
    if (listing.images.length <= 1) {
      showToast({ type: 'warning', message: 'At least one photo is required.' });
      return;
    }
    const updated = listing.images.filter((_, i) => i !== index);
    triggerAutoSave({ images: updated });
  };

  // Generate next 28 days for interactive availability calendar
  const today = new Date();
  const calendarDays: string[] = [];
  for (let i = 0; i < 28; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    calendarDays.push(d.toISOString().split('T')[0]);
  }

  if (loading || !listing) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center text-am-ink-muted">
        <p className="text-sm">Loading item details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-4 px-4 flex flex-col gap-8 text-left">
      {/* Top Header & Save Status Indicator */}
      <div className="flex items-center justify-between">
        <Link
          to="/items"
          className="flex items-center gap-1.5 text-xs font-semibold text-am-ink-muted hover:text-am-ink transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>My Items</span>
        </Link>

        {/* Live Saved Indicator */}
        <div className="flex items-center gap-3">
          {saveStatus === 'saving' && (
            <span className="text-xs text-am-ink-muted animate-pulse font-medium">Saving changes...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-am-success font-medium flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}

          <Button
            variant="secondary"
            size="sm"
            icon={listing.status === 'paused' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            onClick={handleTogglePause}
          >
            {listing.status === 'paused' ? 'Resume' : 'Pause'}
          </Button>
        </div>
      </div>

      {/* Item Title & Status Banner */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
              listing.status === 'active'
                ? 'bg-am-success/15 text-am-success border border-am-success/30'
                : 'bg-am-warning/15 text-am-warning border border-am-warning/30'
            }`}
          >
            {listing.status}
          </span>
          <span className="text-xs text-am-ink-muted">
            • {listing.category}
          </span>
        </div>

        <input
          type="text"
          value={listing.title}
          onChange={(e) => triggerAutoSave({ title: e.target.value })}
          className="font-heading text-2xl sm:text-3xl font-semibold text-am-ink bg-transparent border-b border-transparent hover:border-am-border focus:border-am-primary focus:outline-none transition py-1"
          placeholder="Item title"
        />
      </div>

      {/* Item Journey Progress */}
      <section className="p-4 rounded-am-card border border-am-border bg-am-surface shadow-am-soft">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-am-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-am-ink">
              Item Journey
            </h3>
          </div>
          <span className="text-xs font-semibold text-am-primary">
            {itemStats.reuseCount} Total Reuses
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="p-2 rounded-am-input bg-am-surface-2 border border-am-border">
            <span className="text-[10px] uppercase font-semibold text-am-ink-muted block">1. Listed</span>
            <span className="font-semibold text-am-ink">Active</span>
          </div>
          <div className="p-2 rounded-am-input bg-am-surface-2 border border-am-border">
            <span className="text-[10px] uppercase font-semibold text-am-ink-muted block">2. Requests</span>
            <span className="font-semibold text-am-ink">{itemStats.requested}</span>
          </div>
          <div className="p-2 rounded-am-input bg-am-surface-2 border border-am-border">
            <span className="text-[10px] uppercase font-semibold text-am-ink-muted block">3. Borrowed</span>
            <span className="font-semibold text-am-ink">{itemStats.borrowed}</span>
          </div>
          <div className="p-2 rounded-am-input bg-am-surface-2 border border-am-border">
            <span className="text-[10px] uppercase font-semibold text-am-ink-muted block">4. Returned</span>
            <span className="font-semibold text-am-ink">{itemStats.returned}</span>
          </div>
        </div>
      </section>

      {/* Photo Gallery & Management */}
      <section>
        <label className="text-xs font-semibold uppercase tracking-wider text-am-ink-muted block mb-2">
          Photos ({listing.images.length}/5)
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {listing.images.map((img, idx) => (
            <div
              key={idx}
              className="relative aspect-square rounded-am-card border border-am-border overflow-hidden bg-am-surface-2 group"
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removePhoto(idx)}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black transition"
                aria-label="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {idx === 0 && (
                <span className="absolute bottom-1 left-1 text-[9px] bg-am-primary text-white px-1.5 py-0.5 rounded-full font-semibold">
                  Cover
                </span>
              )}
            </div>
          ))}

          {listing.images.length < 5 && (
            <label className="aspect-square rounded-am-card border border-dashed border-am-border hover:border-am-primary bg-am-surface-2/60 flex flex-col items-center justify-center p-3 text-center cursor-pointer transition">
              <Upload className="w-5 h-5 text-am-ink-muted mb-1" />
              <span className="text-[11px] font-medium text-am-ink">Add photo</span>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          )}
        </div>
      </section>

      {/* Inline Editable Fields */}
      <section className="flex flex-col gap-4">
        <Textarea
          label="Description"
          value={listing.description}
          onChange={(e) => triggerAutoSave({ description: e.target.value })}
          rows={3}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Condition"
            value={listing.condition}
            onChange={(e) => triggerAutoSave({ condition: e.target.value as any })}
            options={CONDITIONS.map((c) => ({ label: c, value: c }))}
          />

          <Input
            label="Replacement Value (INR)"
            type="number"
            value={listing.replacementValue}
            onChange={(e) => triggerAutoSave({ replacementValue: Number(e.target.value) })}
            startAdornment="₹"
          />
        </div>

        {listing.transactionType === 'rent' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Price Per Day (INR)"
              type="number"
              value={listing.pricePerDay}
              onChange={(e) => triggerAutoSave({ pricePerDay: Number(e.target.value) })}
              startAdornment="₹"
            />
            <Input
              label="Min Days"
              type="number"
              value={listing.minDays}
              onChange={(e) => triggerAutoSave({ minDays: Number(e.target.value) })}
            />
            <Input
              label="Max Days"
              type="number"
              value={listing.maxDays}
              onChange={(e) => triggerAutoSave({ maxDays: Number(e.target.value) })}
            />
          </div>
        )}

        <Input
          label="House Rules"
          value={listing.rules || ''}
          placeholder="e.g. Return clean, indoor use only"
          onChange={(e) => triggerAutoSave({ rules: e.target.value })}
        />

        <Input
          label="Handover Instructions"
          value={listing.handover || ''}
          placeholder="e.g. Pickup at Tower C lobby"
          onChange={(e) => triggerAutoSave({ handover: e.target.value })}
        />
      </section>

      {/* Interactive Availability Calendar */}
      <section className="p-4 rounded-am-card border border-am-border bg-am-surface shadow-am-soft">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-am-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-am-ink">
              Manage Blocked Dates (Next 4 Weeks)
            </h3>
          </div>
          <span className="text-[11px] text-am-ink-muted">Tap a date to block/unblock</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {calendarDays.map((dStr) => {
            const lock = lockedDays[dStr];
            const isBooking = lock && lock.type === 'booking';
            const isBlocked = lock && lock.type === 'blocked';
            const dateObj = new Date(dStr + 'T00:00:00Z');
            const dayNum = dateObj.getUTCDate();
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'narrow' });

            return (
              <button
                key={dStr}
                onClick={() => handleToggleDayLock(dStr)}
                disabled={isBooking}
                className={`h-12 rounded-am-input border text-xs flex flex-col items-center justify-center transition cursor-pointer ${
                  isBooking
                    ? 'bg-am-sand/80 border-am-primary text-am-primary cursor-not-allowed opacity-90'
                    : isBlocked
                    ? 'bg-am-danger/15 border-am-danger text-am-danger'
                    : 'bg-am-surface-2 border-am-border text-am-ink hover:border-am-primary'
                }`}
                title={isBooking ? `Booked on ${dStr}` : isBlocked ? `Blocked on ${dStr}` : `Available ${dStr}`}
              >
                <span className="text-[9px] text-am-ink-muted uppercase">{dayName}</span>
                <span className="font-semibold text-xs">{dayNum}</span>
                {isBooking && <Lock className="w-2.5 h-2.5 text-am-primary" />}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 text-[11px] text-am-ink-muted mt-3 pt-3 border-t border-am-border/60">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-am-surface-2 border border-am-border" /> Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-am-danger/20 border border-am-danger" /> Blocked by you
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-am-sand border border-am-primary" /> Reserved booking
          </span>
        </div>
      </section>

      {/* Public Link Preview */}
      <div className="flex items-center justify-between p-4 rounded-am-card border border-am-border bg-am-surface-2/40">
        <div>
          <h4 className="text-xs font-semibold text-am-ink">View Public Listing</h4>
          <p className="text-[11px] text-am-ink-muted">See how neighbors view this item</p>
        </div>
        <Link to={`/listing/${id}`}>
          <Button variant="secondary" size="sm">
            Open listing
          </Button>
        </Link>
      </div>
    </div>
  );
};
