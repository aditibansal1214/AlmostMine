import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { Button } from '../components/ui/Button';
import { formatINR } from '../domain/rules';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Booking } from '../domain/types';
import {
  Settings as SettingsIcon,
  Package,
  Inbox,
  LogOut,
  Shield,
  Sparkles,
  Award,
  ChevronRight,
  TrendingUp,
  Database,
  BarChart3,
} from 'lucide-react';

export const Me: React.FC = () => {
  const { currentUser, publicProfile, logout } = useAuth();
  const [completedOwnerCount, setCompletedOwnerCount] = useState(0);
  const [completedBorrowerCount, setCompletedBorrowerCount] = useState(0);
  const [earnedTotal, setEarnedTotal] = useState(0);
  const [savedTotal, setSavedTotal] = useState(0);

  useEffect(() => {
    if (!currentUser) return;
    async function loadImpact() {
      try {
        const ownerSnap = await getDocs(
          query(
            collection(db, 'bookings'),
            where('ownerId', '==', currentUser!.uid),
            where('status', '==', 'completed')
          )
        );
        let earned = 0;
        ownerSnap.forEach((d) => {
          const b = d.data() as Booking;
          const comm = b.commissionPct ?? 0.08;
          earned += (b.agreedTotal || 0) * (1 - comm);
        });
        setCompletedOwnerCount(ownerSnap.size);
        setEarnedTotal(Math.round(earned));

        const borrowerSnap = await getDocs(
          query(
            collection(db, 'bookings'),
            where('borrowerId', '==', currentUser!.uid),
            where('status', '==', 'completed')
          )
        );
        let saved = 0;
        borrowerSnap.forEach((d) => {
          const b = d.data() as Booking;
          if (b.wouldHaveBought === 'yes') {
            const repl = b.listingSnapshot?.replacementValue || 0;
            const fee = b.agreedTotal || 0;
            saved += Math.max(0, repl - fee);
          }
        });
        setCompletedBorrowerCount(borrowerSnap.size);
        setSavedTotal(Math.round(saved));
      } catch (err) {
        console.warn('Error loading impact stats:', err);
      }
    }
    loadImpact();
  }, [currentUser]);

  return (
    <div className="max-w-2xl mx-auto py-4 px-4 flex flex-col gap-6 text-left">
      {/* Profile Card */}
      <div className="p-5 rounded-am-card border border-am-border bg-am-surface shadow-am-soft flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
        <div className="w-16 h-16 rounded-full border border-am-border bg-am-surface-2 flex items-center justify-center font-heading font-semibold text-am-primary text-xl overflow-hidden shrink-0">
          {publicProfile?.avatarUrl ? (
            <img src={publicProfile.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            (publicProfile?.displayName || 'M').charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="font-heading text-xl font-semibold text-am-ink">
                {publicProfile?.displayName || 'Community Member'}
              </h1>
              <p className="text-xs text-am-ink-muted">
                @{publicProfile?.username || 'member'} • {publicProfile?.locality || 'Nearby'}
              </p>
            </div>
            <Link to="/settings">
              <Button variant="secondary" size="sm" icon={<SettingsIcon className="w-3.5 h-3.5" />}>
                Settings
              </Button>
            </Link>
          </div>

          {publicProfile?.bio && (
            <p className="text-xs text-am-ink mt-3 leading-relaxed">"{publicProfile.bio}"</p>
          )}
        </div>
      </div>

      {/* Impact Scorecard */}
      <section className="p-5 rounded-am-card border border-am-border bg-am-surface shadow-am-soft flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-am-border pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-am-primary" />
            <h3 className="font-heading text-base font-semibold text-am-ink">
              Impact Scorecard
            </h3>
          </div>
          <Link to="/insights" className="text-xs font-semibold text-am-primary hover:underline">
            Detailed insights →
          </Link>
        </div>

        {/* Panel 1: Recorded Impact */}
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-am-ink-muted block mb-2">
            Recorded Completed Activity
          </span>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-am-input bg-am-surface-2 border border-am-border">
              <span className="text-[10px] text-am-ink-muted uppercase font-semibold block">Completed Exchanges</span>
              <span className="font-heading text-xl font-semibold text-am-ink">
                {completedOwnerCount + completedBorrowerCount}
              </span>
            </div>
            <div className="p-3 rounded-am-input bg-am-surface-2 border border-am-border">
              <span className="text-[10px] text-am-ink-muted uppercase font-semibold block">Owner Earnings</span>
              <span className="font-heading text-xl font-semibold text-am-primary">
                {formatINR(earnedTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Panel 2: Estimated Savings */}
        <div className="pt-2 border-t border-am-border">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-am-accent block mb-2">
            Estimated Borrower Savings
          </span>
          <div className="p-3 rounded-am-input bg-am-surface-2 border border-am-border flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-am-ink block">
                Purchase Spend Avoided
              </span>
              <span className="text-[10px] text-am-ink-muted">
                Based on replacement value avoided when you would have bought new
              </span>
            </div>
            <span className="font-heading text-xl font-semibold text-am-ink">
              {formatINR(savedTotal)}
            </span>
          </div>
        </div>
      </section>

      {/* Quick Navigation Links */}
      <div className="flex flex-col gap-2">
        <Link
          to="/items"
          className="p-4 rounded-am-card border border-am-border bg-am-surface hover:bg-am-surface-2 transition flex items-center justify-between text-sm"
        >
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-am-primary" />
            <span className="font-medium text-am-ink">My Items & Availability</span>
          </div>
          <ChevronRight className="w-4 h-4 text-am-ink-muted" />
        </Link>

        <Link
          to="/requests"
          className="p-4 rounded-am-card border border-am-border bg-am-surface hover:bg-am-surface-2 transition flex items-center justify-between text-sm"
        >
          <div className="flex items-center gap-3">
            <Inbox className="w-5 h-5 text-am-primary" />
            <span className="font-medium text-am-ink">Requests & Exchange Checklists</span>
          </div>
          <ChevronRight className="w-4 h-4 text-am-ink-muted" />
        </Link>

        <Link
          to="/settings"
          className="p-4 rounded-am-card border border-am-border bg-am-surface hover:bg-am-surface-2 transition flex items-center justify-between text-sm"
        >
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-5 h-5 text-am-primary" />
            <span className="font-medium text-am-ink">Account & Privacy Settings</span>
          </div>
          <ChevronRight className="w-4 h-4 text-am-ink-muted" />
        </Link>

        {/* Administration Links */}
        <div className="pt-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-am-accent block mb-2 px-1">
            Marketplace Administration
          </span>
          <div className="flex flex-col gap-2">
            <Link
              to="/admin/demo"
              className="p-4 rounded-am-card border border-am-border bg-amber-500/5 hover:bg-amber-500/10 transition flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-amber-600" />
                <div>
                  <span className="font-semibold text-am-ink block">Admin Demo Data Studio</span>
                  <span className="text-[11px] text-am-ink-muted">Seed, status, and safe reset for synthetic data</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-am-ink-muted" />
            </Link>

            <Link
              to="/admin/analytics"
              className="p-4 rounded-am-card border border-am-border bg-am-surface hover:bg-am-surface-2 transition flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-am-primary" />
                <div>
                  <span className="font-semibold text-am-ink block">Marketplace Analytics (8 Models)</span>
                  <span className="text-[11px] text-am-ink-muted">Descriptive, diagnostic, predictive, and prescriptive intelligence</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-am-ink-muted" />
            </Link>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <Button variant="ghost" size="md" icon={<LogOut className="w-4 h-4" />} onClick={logout}>
          Sign out
        </Button>
      </div>
    </div>
  );
};
