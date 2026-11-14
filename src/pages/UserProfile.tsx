import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PublicProfile, Listing, Review } from '../domain/types';
import { ListingCard } from '../components/ui/ListingCard';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ArrowLeft, Shield, CheckCircle2, Star, Calendar, MapPin, Package } from 'lucide-react';

export const UserProfile: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    async function loadPublicData() {
      try {
        setLoading(true);
        const pDoc = await getDoc(doc(db, 'publicProfiles', uid!));
        if (pDoc.exists()) {
          setProfile(pDoc.data() as PublicProfile);
        }

        // Active listings
        const lSnap = await getDocs(
          query(
            collection(db, 'listings'),
            where('ownerId', '==', uid),
            where('status', '==', 'active')
          )
        );
        setListings(lSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Listing)));

        // Completed bookings count
        const bSnap = await getDocs(
          query(
            collection(db, 'bookings'),
            where('ownerId', '==', uid),
            where('status', '==', 'completed')
          )
        );
        setCompletedCount(bSnap.size);

        // Reviews
        const rSnap = await getDocs(
          query(collection(db, 'reviews'), where('revieweeId', '==', uid))
        );
        setReviews(rSnap.docs.map((d) => d.data() as Review));
      } catch (err) {
        console.warn('Error loading public profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadPublicData();
  }, [uid]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-am-ink-muted">
        <p className="text-sm">Loading member profile...</p>
      </div>
    );
  }

  if (!profile || profile.deleted) {
    return (
      <div className="max-w-md mx-auto py-12 text-center text-am-ink-muted">
        <h3 className="font-heading text-lg text-am-ink mb-2">Member not found</h3>
        <p className="text-xs mb-4">This profile may have been removed or deactivated.</p>
        <Link to="/browse" className="text-am-primary text-xs font-semibold hover:underline">
          Return to Browse
        </Link>
      </div>
    );
  }

  const averageRating =
    reviews.length >= 3
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  return (
    <div className="max-w-4xl mx-auto py-4 px-4 flex flex-col gap-8 text-left">
      <Link
        to="/browse"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-am-ink-muted hover:text-am-ink transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Browse</span>
      </Link>

      {/* Member Header Card */}
      <div className="p-6 rounded-am-card border border-am-border bg-am-surface shadow-am-soft flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
        <div className="w-20 h-20 rounded-full border border-am-border bg-am-surface-2 flex items-center justify-center font-heading font-semibold text-am-primary text-2xl overflow-hidden shrink-0">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            profile.displayName.charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="font-heading text-2xl font-semibold text-am-ink">
                {profile.displayName}
              </h1>
              <p className="text-xs text-am-ink-muted">
                @{profile.username}
                {profile.visibility?.locality !== false && profile.locality && (
                  <span> • {profile.locality}</span>
                )}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-am-success/15 text-am-success text-xs font-semibold self-center sm:self-auto">
              <CheckCircle2 className="w-3.5 h-3.5" /> Community Member
            </span>
          </div>

          {profile.visibility?.bio !== false && profile.bio && (
            <p className="text-sm text-am-ink mt-3 leading-relaxed">"{profile.bio}"</p>
          )}

          {profile.visibility?.interests !== false && profile.interests && profile.interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 justify-center sm:justify-start">
              {profile.interests.map((it) => (
                <span
                  key={it}
                  className="px-2.5 py-0.5 rounded-full bg-am-surface-2 border border-am-border text-[11px] font-medium text-am-ink-muted"
                >
                  {it}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Community Trust Profile Section */}
      <section className="p-5 rounded-am-card border border-am-border bg-am-surface shadow-am-soft">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-am-primary" />
          <h2 className="font-heading text-base font-semibold text-am-ink">
            Community Trust Indicators
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
          <div className="p-3 rounded-am-input bg-am-surface-2 border border-am-border">
            <span className="text-[10px] uppercase font-semibold text-am-ink-muted block">Completed</span>
            <span className="font-heading text-xl font-semibold text-am-ink">{completedCount}</span>
            <span className="text-[9px] text-am-ink-muted block mt-0.5">Exchanges</span>
          </div>

          <div className="p-3 rounded-am-input bg-am-surface-2 border border-am-border">
            <span className="text-[10px] uppercase font-semibold text-am-ink-muted block">Rating</span>
            <span className="font-heading text-xl font-semibold text-am-ink">
              {averageRating ? `★ ${averageRating}` : '—'}
            </span>
            <span className="text-[9px] text-am-ink-muted block mt-0.5">
              {reviews.length >= 3 ? `${reviews.length} reviews` : 'Min 3 needed'}
            </span>
          </div>

          <div className="p-3 rounded-am-input bg-am-surface-2 border border-am-border">
            <span className="text-[10px] uppercase font-semibold text-am-ink-muted block">Active Gear</span>
            <span className="font-heading text-xl font-semibold text-am-ink">{listings.length}</span>
            <span className="text-[9px] text-am-ink-muted block mt-0.5">Listings sharing</span>
          </div>

          <div className="p-3 rounded-am-input bg-am-surface-2 border border-am-border">
            <span className="text-[10px] uppercase font-semibold text-am-ink-muted block">Status</span>
            <span className="font-heading text-xl font-semibold text-am-success">Good</span>
            <span className="text-[9px] text-am-ink-muted block mt-0.5">Zero late cancels</span>
          </div>
        </div>
      </section>

      {/* Active Listings by Member */}
      <section>
        <h2 className="font-heading text-lg font-semibold text-am-ink mb-4">
          Shared by {profile.displayName} ({listings.length})
        </h2>

        {listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {listings.map((item) => (
              <ListingCard key={item.id} listing={item} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-am-ink-muted italic">
            This member currently has no active listings available.
          </p>
        )}
      </section>

      {/* Reviews list */}
      {reviews.length > 0 && (
        <section className="p-5 rounded-am-card border border-am-border bg-am-surface">
          <h2 className="font-heading text-base font-semibold text-am-ink mb-4">
            Recent Neighbor Reviews ({reviews.length})
          </h2>
          <div className="flex flex-col gap-3">
            {reviews.map((r, i) => (
              <div key={i} className="p-3 rounded-am-input bg-am-surface-2/60 border border-am-border text-xs">
                <div className="flex items-center gap-1 text-am-accent mb-1 font-semibold">
                  {'★'.repeat(r.rating)}
                </div>
                {r.text && <p className="text-am-ink italic">"{r.text}"</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
