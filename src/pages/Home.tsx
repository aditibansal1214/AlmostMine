import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { KPITile } from '../components/ui/KPITile';
import { ListingCard } from '../components/ui/ListingCard';
import { Button } from '../components/ui/Button';
import { Listing, Booking } from '../domain/types';
import { formatINR } from '../domain/rules';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { ArrowRight, Plus, Sparkles, Inbox, Package, CheckCircle2 } from 'lucide-react';

export const Home: React.FC = () => {
  const { currentUser, userPrivate, publicProfile } = useAuth();
  const [activeListingsCount, setActiveListingsCount] = useState<number>(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [earnedTotal, setEarnedTotal] = useState<number>(0);
  const [estimatedSavings, setEstimatedSavings] = useState<number>(0);
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [userListings, setUserListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const firstName = userPrivate?.firstName || publicProfile?.displayName?.split(' ')[0] || 'Member';

  useEffect(() => {
    if (!currentUser) return;

    async function loadHomeData() {
      try {
        setLoading(true);
        // 1. My active listings count & list
        const myListingsQuery = query(
          collection(db, 'listings'),
          where('ownerId', '==', currentUser!.uid)
        );
        const myListingsSnap = await getDocs(myListingsQuery);
        const myItems = myListingsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Listing));
        const activeItems = myItems.filter((i) => i.status === 'active');
        setUserListings(myItems);
        setActiveListingsCount(activeItems.length);

        // 2. Pending requests asked of me
        const requestsQuery = query(
          collection(db, 'bookings'),
          where('ownerId', '==', currentUser!.uid),
          where('status', '==', 'pending')
        );
        const reqSnap = await getDocs(requestsQuery);
        setPendingRequestsCount(reqSnap.size);

        // 3. Completed bookings as owner (Earned)
        const completedOwnerQuery = query(
          collection(db, 'bookings'),
          where('ownerId', '==', currentUser!.uid),
          where('status', '==', 'completed')
        );
        const completedOwnerSnap = await getDocs(completedOwnerQuery);
        let netEarned = 0;
        completedOwnerSnap.forEach((doc) => {
          const b = doc.data() as Booking;
          const comm = b.commissionPct ?? 0.08;
          netEarned += (b.agreedTotal || 0) * (1 - comm);
        });
        setEarnedTotal(Math.round(netEarned));

        // 4. Completed bookings as borrower (Estimated Saved)
        const completedBorrowerQuery = query(
          collection(db, 'bookings'),
          where('borrowerId', '==', currentUser!.uid),
          where('status', '==', 'completed')
        );
        const completedBorrowerSnap = await getDocs(completedBorrowerQuery);
        let totalSavings = 0;
        completedBorrowerSnap.forEach((doc) => {
          const b = doc.data() as Booking;
          if (b.wouldHaveBought === 'yes') {
            const repl = b.listingSnapshot?.replacementValue || 0;
            const fee = b.agreedTotal || 0;
            totalSavings += Math.max(0, repl - fee);
          }
        });
        setEstimatedSavings(Math.round(totalSavings));

        // 5. Recently added in community
        const communityId = publicProfile?.communityId || 'comm_greenfield';
        const recentQuery = query(
          collection(db, 'listings'),
          where('status', '==', 'active'),
          limit(6)
        );
        const recentSnap = await getDocs(recentQuery);
        const recents = recentSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Listing))
          .filter((l) => l.ownerId !== currentUser!.uid);
        setRecentListings(recents);
      } catch (err) {
        console.warn('Home data load notice:', err);
      } finally {
        setLoading(false);
      }
    }

    loadHomeData();
  }, [currentUser, publicProfile?.communityId]);

  // Compute at most 3 "Next Best Actions"
  const nextBestActions = [];
  if (pendingRequestsCount > 0) {
    nextBestActions.push({
      id: 'pending_requests',
      icon: <Inbox className="w-4 h-4 text-am-warning shrink-0" />,
      title: `You have ${pendingRequestsCount} request${pendingRequestsCount > 1 ? 's' : ''} waiting`,
      desc: 'Review and approve dates to lock the calendar.',
      actionLabel: 'View requests',
      to: '/requests',
    });
  }
  if (activeListingsCount === 0) {
    nextBestActions.push({
      id: 'list_first',
      icon: <Package className="w-4 h-4 text-am-primary shrink-0" />,
      title: 'List your first idle item',
      desc: 'Most members start with a camera, drill, or luggage.',
      actionLabel: 'Add an item',
      to: '/items/new',
    });
  }
  if (userListings.some((l) => l.status === 'paused')) {
    nextBestActions.push({
      id: 'resume_paused',
      icon: <Sparkles className="w-4 h-4 text-am-accent shrink-0" />,
      title: 'You have paused listings',
      desc: 'Ready to share again? Unpause to make them discoverable.',
      actionLabel: 'Manage items',
      to: '/items',
    });
  }
  if (nextBestActions.length < 3) {
    nextBestActions.push({
      id: 'browse_gear',
      icon: <Sparkles className="w-4 h-4 text-am-primary shrink-0" />,
      title: 'Need anything for this weekend?',
      desc: 'Explore available tools and travel gear nearby.',
      actionLabel: 'Browse gear',
      to: '/browse',
    });
  }
  const topThreeActions = nextBestActions.slice(0, 3);

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      {/* 1. Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-am-ink">
            Hello, {firstName}
          </h1>
          <p className="text-sm text-am-ink-muted mt-0.5">
            Community: <span className="font-medium text-am-ink">{publicProfile?.locality || 'Sarjapur, Bengaluru'}</span>
          </p>
        </div>

        <Link to="/items/new" className="inline-flex">
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />}>
            Add item
          </Button>
        </Link>
      </div>

      {/* 2. Home KPI Row (At most 4 tiles visible) */}
      <section aria-labelledby="kpi_heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="kpi_heading" className="text-xs font-semibold uppercase tracking-wider text-am-ink-muted">
            Overview
          </h2>
          <Link to="/insights" className="text-xs font-semibold text-am-primary hover:underline">
            More insights →
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KPITile
            definitionId="earned"
            value={formatINR(earnedTotal)}
            trend={earnedTotal > 0 ? 'Recorded completed earnings' : 'No completed rentals yet'}
          />
          <KPITile
            definitionId="itemsSharing"
            value={activeListingsCount}
            trend={`${activeListingsCount} active in community`}
          />
          <KPITile
            definitionId="requestsWaiting"
            value={pendingRequestsCount}
            trend={pendingRequestsCount > 0 ? 'Action required' : 'All clear'}
          />
          <KPITile
            definitionId="saved"
            value={formatINR(estimatedSavings)}
            trend={estimatedSavings > 0 ? 'Avoided purchase spend' : 'Borrow items to track savings'}
          />
        </div>
      </section>

      {/* 3. Next Best Actions (at most 3) */}
      <section aria-labelledby="actions_heading">
        <h2 id="actions_heading" className="text-xs font-semibold uppercase tracking-wider text-am-ink-muted mb-3">
          Next Best Actions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topThreeActions.map((act) => (
            <div
              key={act.id}
              className="p-4 rounded-am-card border border-am-border bg-am-surface shadow-am-soft flex flex-col justify-between"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 rounded-full bg-am-surface-2 mt-0.5">{act.icon}</div>
                <div>
                  <h3 className="text-sm font-semibold text-am-ink leading-tight mb-1">{act.title}</h3>
                  <p className="text-xs text-am-ink-muted leading-relaxed">{act.desc}</p>
                </div>
              </div>
              <Link to={act.to} className="w-full mt-2">
                <Button variant="secondary" size="sm" className="w-full justify-between">
                  <span>{act.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Recently Added Row */}
      <section aria-labelledby="recent_heading">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 id="recent_heading" className="font-heading text-lg font-semibold text-am-ink">
              Recently added nearby
            </h2>
            <p className="text-xs text-am-ink-muted">Fresh listings in your cluster</p>
          </div>
          <Link to="/browse" className="text-xs font-semibold text-am-primary hover:underline">
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-4/3 rounded-am-card bg-am-surface-2 animate-pulse" />
            ))}
          </div>
        ) : recentListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {recentListings.map((item) => (
              <ListingCard key={item.id} listing={item} />
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-am-card border border-dashed border-am-border bg-am-surface/60 text-center">
            <p className="text-sm text-am-ink-muted mb-3">No other items listed in your cluster yet.</p>
            <Link to="/items/new">
              <Button variant="primary" size="sm">
                List the first item
              </Button>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
};
