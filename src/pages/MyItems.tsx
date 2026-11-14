import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { useToast } from '../lib/toastContext';
import { Listing, Booking } from '../domain/types';
import { ListingCard } from '../components/ui/ListingCard';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { db } from '../lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { Plus, Package, Archive, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

export const MyItems: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [items, setItems] = useState<Listing[]>([]);
  const [removedItems, setRemovedItems] = useState<Listing[]>([]);
  const [statsMap, setStatsMap] = useState<
    Record<string, { requestsCount: number; completedCount: number; earnedTotal: number }>
  >({});
  const [loading, setLoading] = useState(true);

  // Removal blocked modal state
  const [blockedModalOpen, setBlockedModalOpen] = useState(false);
  const [blockedItem, setBlockedItem] = useState<Listing | null>(null);

  // Permanent delete modal state
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<Listing | null>(null);
  const [deletingPermanent, setDeletingPermanent] = useState(false);

  const fetchMyItems = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const q = query(
        collection(db, 'listings'),
        where('ownerId', '==', currentUser.uid)
      );
      const snap = await getDocs(q);
      const all: Listing[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Listing));

      const activeOrDraft = all.filter((i) => i.status !== 'removed');
      const removed = all.filter((i) => i.status === 'removed');

      setItems(activeOrDraft);
      setRemovedItems(removed);

      // Fetch stats for all user's listings from bookings
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('ownerId', '==', currentUser.uid)
      );
      const bookingsSnap = await getDocs(bookingsQuery);
      const map: Record<string, { requestsCount: number; completedCount: number; earnedTotal: number }> = {};

      all.forEach((item) => {
        map[item.id] = { requestsCount: 0, completedCount: 0, earnedTotal: 0 };
      });

      bookingsSnap.forEach((bDoc) => {
        const b = bDoc.data() as Booking;
        if (!map[b.listingId]) {
          map[b.listingId] = { requestsCount: 0, completedCount: 0, earnedTotal: 0 };
        }
        map[b.listingId].requestsCount += 1;
        if (b.status === 'completed') {
          map[b.listingId].completedCount += 1;
          const comm = b.commissionPct ?? 0.08;
          map[b.listingId].earnedTotal += (b.agreedTotal || 0) * (1 - comm);
        }
      });

      setStatsMap(map);
    } catch (err) {
      console.warn('Failed to fetch my items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyItems();
  }, [currentUser]);

  // Pause / Resume with one tap
  const handleTogglePause = async (item: Listing) => {
    const newStatus = item.status === 'paused' ? 'active' : 'paused';
    // Optimistic UI update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i))
    );

    try {
      const itemRef = doc(db, 'listings', item.id);
      await updateDoc(itemRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
        ...(newStatus === 'active' ? { lastReactivatedAt: serverTimestamp() } : {}),
      });
      showToast({
        type: 'success',
        message: newStatus === 'active' ? `"${item.title}" is now active in Browse.` : `"${item.title}" is now paused.`,
      });
    } catch (err) {
      console.error('Error toggling pause:', err);
      // Rollback
      fetchMyItems();
      showToast({ type: 'danger', message: 'Could not update listing status.' });
    }
  };

  // Remove logic: check for pending or approved bookings
  const handleRemove = async (item: Listing) => {
    try {
      // Check for active or pending bookings
      const activeBookingsQuery = query(
        collection(db, 'bookings'),
        where('listingId', '==', item.id),
        where('status', 'in', ['pending', 'approved'])
      );
      const activeSnap = await getDocs(activeBookingsQuery);

      if (!activeSnap.empty) {
        // Removal blocked! Offer pause instead
        setBlockedItem(item);
        setBlockedModalOpen(true);
        return;
      }

      // Soft-remove with 8-second Undo toast
      const previousItems = items;
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setRemovedItems((prev) => [...prev, { ...item, status: 'removed' }]);

      const itemRef = doc(db, 'listings', item.id);
      await updateDoc(itemRef, {
        status: 'removed',
        removedAt: serverTimestamp(),
      });

      showToast({
        type: 'info',
        message: `Removed "${item.title}".`,
        actionLabel: 'Undo',
        duration: 8000,
        onAction: async () => {
          // Restore
          await updateDoc(itemRef, {
            status: item.status, // previous status
            removedAt: null,
            updatedAt: serverTimestamp(),
          });
          setItems(previousItems);
          setRemovedItems((prev) => prev.filter((i) => i.id !== item.id));
          showToast({ type: 'success', message: `Restored "${item.title}".` });
        },
      });
    } catch (err) {
      console.error('Error removing item:', err);
      fetchMyItems();
    }
  };

  // Restore from removed
  const handleRestore = async (item: Listing) => {
    try {
      const itemRef = doc(db, 'listings', item.id);
      await updateDoc(itemRef, {
        status: 'active',
        removedAt: null,
        updatedAt: serverTimestamp(),
      });
      setRemovedItems((prev) => prev.filter((i) => i.id !== item.id));
      setItems((prev) => [...prev, { ...item, status: 'active' }]);
      showToast({ type: 'success', message: `"${item.title}" restored to Active.` });
    } catch (err) {
      console.error('Error restoring listing:', err);
    }
  };

  // Permanent Delete
  const handlePermanentDelete = async () => {
    if (!permanentDeleteTarget) return;
    try {
      setDeletingPermanent(true);
      await deleteDoc(doc(db, 'listings', permanentDeleteTarget.id));
      setRemovedItems((prev) => prev.filter((i) => i.id !== permanentDeleteTarget.id));
      showToast({ type: 'success', message: 'Item permanently deleted.' });
      setPermanentDeleteTarget(null);
    } catch (err) {
      console.error('Error permanently deleting item:', err);
      showToast({ type: 'danger', message: 'Failed to delete listing.' });
    } finally {
      setDeletingPermanent(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-semibold text-am-ink">
            My Items
          </h1>
          <p className="text-sm text-am-ink-muted">
            Manage what you share with your community
          </p>
        </div>

        <Link to="/items/new" className="hidden sm:inline-flex">
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />}>
            Add an item
          </Button>
        </Link>
      </div>

      {/* Floating Action Button (FAB) on mobile */}
      <div className="sm:hidden fixed bottom-20 right-4 z-30">
        <Link to="/items/new">
          <Button
            variant="primary"
            size="icon"
            className="w-14 h-14 rounded-full shadow-lg"
            aria-label="Add new item"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </Link>
      </div>

      {/* Main Items Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-4/3 rounded-am-card bg-am-surface-2 animate-pulse" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {items.map((item) => (
            <ListingCard
              key={item.id}
              listing={item}
              isOwner={true}
              miniStats={statsMap[item.id]}
              onPauseToggle={() => handleTogglePause(item)}
              onRemove={() => handleRemove(item)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Package className="w-8 h-8" />}
          title="No items listed yet"
          description="Share what sits idle in your closet or garage. Most members start with a camera, power tool, or luggage."
          actionLabel="List your first item"
          onAction={() => (window.location.href = '/items/new')}
        />
      )}

      {/* Removed Items Section (Collapsible) */}
      {removedItems.length > 0 && (
        <section className="mt-8 pt-8 border-t border-am-border">
          <div className="flex items-center gap-2 mb-4 text-am-ink-muted">
            <Archive className="w-4 h-4" />
            <h3 className="text-sm font-semibold uppercase tracking-wider">
              Removed Items ({removedItems.length})
            </h3>
          </div>

          <div className="flex flex-col gap-3">
            {removedItems.map((rItem) => (
              <div
                key={rItem.id}
                className="p-4 rounded-am-card border border-am-border bg-am-surface flex items-center justify-between gap-4"
              >
                <div>
                  <h4 className="text-sm font-medium text-am-ink">{rItem.title}</h4>
                  <p className="text-xs text-am-ink-muted">
                    {rItem.category} • Soft-removed
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<RefreshCw className="w-3.5 h-3.5" />}
                    onClick={() => handleRestore(rItem)}
                  >
                    Restore
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => setPermanentDeleteTarget(rItem)}
                  >
                    Delete permanently
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Removal Blocked Dialog */}
      {blockedItem && (
        <Modal
          isOpen={blockedModalOpen}
          onClose={() => setBlockedModalOpen(false)}
          title="Cannot remove active item"
        >
          <div className="flex flex-col gap-4 text-left">
            <div className="flex items-start gap-3 p-3 rounded-am-input bg-am-warning/15 border border-am-warning/30 text-am-ink">
              <AlertCircle className="w-5 h-5 text-am-warning shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">
                <strong>"{blockedItem.title}"</strong> currently has pending or approved booking requests. An item cannot be removed until those bookings are completed or cancelled.
              </p>
            </div>
            <p className="text-xs text-am-ink-muted">
              You can pause this listing instead. Paused items are hidden from Browse searches, while allowing existing confirmed renters to complete their exchange.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <Button variant="secondary" size="md" onClick={() => setBlockedModalOpen(false)}>
                Keep active
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setBlockedModalOpen(false);
                  handleTogglePause(blockedItem);
                }}
              >
                Pause listing
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Permanent Delete Confirmation Dialog */}
      {permanentDeleteTarget && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setPermanentDeleteTarget(null)}
          onConfirm={handlePermanentDelete}
          title="Permanently delete item?"
          message={`Are you sure you want to permanently delete "${permanentDeleteTarget.title}"? This cannot be undone.`}
          confirmLabel="Delete forever"
          cancelLabel="Keep in archive"
          confirmVariant="danger"
          loading={deletingPermanent}
        />
      )}
    </div>
  );
};
