import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { useToast } from '../lib/toastContext';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { seedDemoData, resetDemoData, getDemoDataStatus, DemoStatusReport } from '../lib/demoSeeder';
import { db, isTokenServiceDisabledError } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  Database,
  Sparkles,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  ShieldCheck,
  Package,
  CalendarCheck,
  Users,
  MessageSquare,
  Bell,
  Heart,
  Search,
  Gift,
  ArrowRight,
  TrendingUp,
  Cpu,
  Layers,
} from 'lucide-react';

export const AdminDemo: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [statusReport, setStatusReport] = useState<DemoStatusReport | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processStage, setProcessStage] = useState<string>('');
  const [processPercent, setProcessPercent] = useState<number>(0);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState<boolean>(false);
  const [demoModeToggle, setDemoModeToggle] = useState<boolean>(true);

  // Load status on mount
  const refreshStatus = async () => {
    try {
      setLoadingStatus(true);
      const rep = await getDemoDataStatus();
      setStatusReport(rep);

      // Also read appConfig/global
      const configSnap = await getDoc(doc(db, 'appConfig', 'global'));
      if (configSnap.exists()) {
        const data = configSnap.data();
        if (data.showDemoListings !== undefined) {
          setDemoModeToggle(data.showDemoListings);
        }
      }
    } catch (err: any) {
      if (isTokenServiceDisabledError(err) || err?.message?.includes('offline')) {
        console.warn('Demo status check deferred: client is currently offline or auth token service is unavailable.');
      } else {
        console.error('Failed to load demo status:', err);
      }
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  // Handle Seeding
  const handleSeed = async () => {
    try {
      setIsProcessing(true);
      setProcessStage('Initializing deterministic synthetic data generator...');
      setProcessPercent(5);

      const rep = await seedDemoData((stage, pct) => {
        setProcessStage(stage);
        setProcessPercent(pct);
      });

      setStatusReport(rep);
      showToast({ message: 'Demo dataset successfully generated and committed to Firestore!', type: 'success' });
    } catch (err: any) {
      console.error('Seeding failed:', err);
      showToast({ message: `Seeding operation failed: ${err.message || 'Unknown error'}`, type: 'danger' });
    } finally {
      setIsProcessing(false);
      setProcessPercent(0);
      setProcessStage('');
      refreshStatus();
    }
  };

  // Handle Safe Reset
  const handleReset = async () => {
    try {
      setShowResetConfirm(false);
      setIsProcessing(true);
      setProcessStage('Executing isolated deletion of demo records...');
      setProcessPercent(10);

      await resetDemoData((stage, pct) => {
        setProcessStage(stage);
        setProcessPercent(pct);
      });

      showToast({ message: 'Demo records safely removed. Real records remain intact.', type: 'info' });
    } catch (err: any) {
      console.error('Reset failed:', err);
      showToast({ message: `Reset failed: ${err.message || 'Unknown error'}`, type: 'danger' });
    } finally {
      setIsProcessing(false);
      setProcessPercent(0);
      setProcessStage('');
      refreshStatus();
    }
  };

  // Handle Regenerate
  const handleRegenerate = async () => {
    try {
      setShowRegenConfirm(false);
      setIsProcessing(true);
      setProcessStage('Resetting previous demo records...');
      setProcessPercent(10);

      await resetDemoData((stage, pct) => {
        setProcessStage(`Resetting: ${stage}`);
        setProcessPercent(Math.round(pct * 0.4));
      });

      setProcessStage('Generating new synthetic marketplace dataset...');
      const rep = await seedDemoData((stage, pct) => {
        setProcessStage(`Seeding: ${stage}`);
        setProcessPercent(Math.round(40 + pct * 0.6));
      });

      setStatusReport(rep);
      showToast({ message: 'Demo dataset safely regenerated!', type: 'success' });
    } catch (err: any) {
      console.error('Regeneration failed:', err);
      showToast({ message: `Regeneration failed: ${err.message || 'Unknown error'}`, type: 'danger' });
    } finally {
      setIsProcessing(false);
      setProcessPercent(0);
      setProcessStage('');
      refreshStatus();
    }
  };

  // Toggle demo listings visibility in marketplace
  const handleToggleDemoListings = async () => {
    const nextVal = !demoModeToggle;
    setDemoModeToggle(nextVal);
    try {
      await setDoc(
        doc(db, 'appConfig', 'global'),
        {
          showDemoListings: nextVal,
          demoModeActive: nextVal,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      showToast({ message: nextVal ? 'Demo listings visible across marketplace.' : 'Marketplace showing live listings only.', type: 'info' });
    } catch (err) {
      console.error('Error toggling demo listings:', err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-4 px-4 flex flex-col gap-6 text-left">
      {/* Breadcrumb / Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-am-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-am-accent mb-1">
            <Database className="w-3.5 h-3.5" />
            <span>Marketplace Administration</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-am-ink">
            Admin Demo Data Studio
          </h1>
          <p className="text-xs sm:text-sm text-am-ink-muted mt-1">
            Generate, inspect, and reset isolated synthetic marketplace records to test all platform features and all 8 analytics models.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/admin/analytics">
            <Button variant="secondary" size="sm" icon={<BarChart3 className="w-4 h-4 text-am-primary" />}>
              Analytics Suite
            </Button>
          </Link>
          <Link to="/admin/analytics/validation">
            <Button variant="secondary" size="sm" icon={<ShieldCheck className="w-4 h-4 text-am-success" />}>
              Validate Fixtures
            </Button>
          </Link>
        </div>
      </div>

      {/* Safety & Isolation Guarantee Card */}
      <div className="p-4 rounded-am-card border border-am-border bg-emerald-500/5 text-xs text-am-ink flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-emerald-950 dark:text-emerald-300">
              Zero Data Overwrite & Namespace Isolation Guarantee
            </h4>
            <p className="text-emerald-800/90 dark:text-emerald-400 mt-0.5">
              Every synthetic document is tagged with <code className="bg-emerald-100 dark:bg-emerald-900/50 px-1 rounded font-mono">dataSource: "demo"</code> and <code className="bg-emerald-100 dark:bg-emerald-900/50 px-1 rounded font-mono">isDemo: true</code>. Real user accounts, listings, and live bookings are never deleted or modified during any demo generation or reset operation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-am-ink">
            <span>Marketplace Demo Filter:</span>
            <input
              type="checkbox"
              checked={demoModeToggle}
              onChange={handleToggleDemoListings}
              className="w-4 h-4 accent-am-primary rounded"
            />
            <span className="font-semibold text-am-primary">{demoModeToggle ? 'Enabled' : 'Hidden'}</span>
          </label>
        </div>
      </div>

      {/* Processing Progress Bar */}
      {isProcessing && (
        <div className="p-5 rounded-am-card border border-am-primary/30 bg-am-surface shadow-am-soft flex flex-col gap-3 animate-pulse">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-am-primary flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              {processStage}
            </span>
            <span className="text-am-ink">{processPercent}%</span>
          </div>
          <div className="w-full bg-am-surface-2 rounded-full h-2 overflow-hidden border border-am-border">
            <div
              className="bg-am-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${processPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-am-ink-muted">
            Executing chunked transactional write batches (250 documents per batch) to respect Cloud Firestore limits.
          </p>
        </div>
      )}

      {/* Control Actions Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Action 1: Generate */}
        <div className="p-5 rounded-am-card border border-am-border bg-am-surface shadow-am-soft flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-am-primary" />
              <h3 className="font-heading font-semibold text-base text-am-ink">
                1. Seed Synthetic Dataset
              </h3>
            </div>
            <p className="text-xs text-am-ink-muted leading-relaxed">
              Creates 50 synthetic users, 100 listings across 12 categories, 200 bookings with full status breakdown, 80 completed reviews, 150 notifications, and 6 months of historical activity.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            icon={<Sparkles className="w-4 h-4" />}
            loading={isProcessing}
            onClick={handleSeed}
          >
            Generate Demo Data
          </Button>
        </div>

        {/* Action 2: Regenerate Safely */}
        <div className="p-5 rounded-am-card border border-am-border bg-am-surface shadow-am-soft flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="w-5 h-5 text-am-accent" />
              <h3 className="font-heading font-semibold text-base text-am-ink">
                2. Regenerate Safely
              </h3>
            </div>
            <p className="text-xs text-am-ink-muted leading-relaxed">
              Cleans existing synthetic records and regenerates fresh, deterministic data. Useful when resetting analytics baselines or after testing booking state changes.
            </p>
          </div>
          <Button
            variant="secondary"
            size="md"
            icon={<RefreshCw className="w-4 h-4" />}
            loading={isProcessing}
            onClick={() => setShowRegenConfirm(true)}
          >
            Regenerate Dataset
          </Button>
        </div>

        {/* Action 3: Safe Reset */}
        <div className="p-5 rounded-am-card border border-am-border bg-am-surface shadow-am-soft flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              <h3 className="font-heading font-semibold text-base text-am-ink">
                3. Reset Demo Data
              </h3>
            </div>
            <p className="text-xs text-am-ink-muted leading-relaxed">
              Deletes exclusively documents tagged with <code className="bg-am-surface-2 px-1 rounded font-mono">dataSource: "demo"</code>. Returns Firestore to clean production state without affecting real users.
            </p>
          </div>
          <Button
            variant="danger"
            size="md"
            icon={<Trash2 className="w-4 h-4" />}
            loading={isProcessing}
            onClick={() => setShowResetConfirm(true)}
          >
            Safe Reset Only
          </Button>
        </div>
      </div>

      {/* Live Firestore Document Counts Matrix */}
      <section className="p-5 rounded-am-card border border-am-border bg-am-surface shadow-am-soft flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-am-border pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-am-primary" />
            <h3 className="font-heading text-base font-semibold text-am-ink">
              Live Cloud Firestore Document Counts & Status
            </h3>
          </div>
          <button
            onClick={refreshStatus}
            disabled={loadingStatus}
            className="text-xs font-semibold text-am-primary hover:underline flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
            Refresh Counts
          </button>
        </div>

        {/* Grid of Counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {/* Users */}
          <div className="p-3 rounded-am-input bg-am-surface-2 border border-am-border">
            <div className="flex items-center justify-between text-am-ink-muted mb-1">
              <span className="text-[10px] font-semibold uppercase">Users (Profiles)</span>
              <Users className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-heading text-xl font-bold text-am-ink">
                {statusReport?.counts.users ?? 0}
              </span>
              <span className="text-[11px] text-am-ink-muted">/ 50 req</span>
            </div>
            <span className={`text-[10px] font-medium ${(statusReport?.counts.users || 0) >= 50 ? 'text-am-success' : 'text-am-ink-muted'}`}>
              {(statusReport?.counts.users || 0) >= 50 ? 'Target satisfied' : 'Needs seed'}
            </span>
          </div>

          {/* Listings */}
          <div className="p-3 rounded-am-input bg-am-surface-2 border border-am-border">
            <div className="flex items-center justify-between text-am-ink-muted mb-1">
              <span className="text-[10px] font-semibold uppercase">Listings</span>
              <Package className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-heading text-xl font-bold text-am-ink">
                {statusReport?.counts.listings ?? 0}
              </span>
              <span className="text-[11px] text-am-ink-muted">/ 100 req</span>
            </div>
            <span className={`text-[10px] font-medium ${(statusReport?.counts.listings || 0) >= 100 ? 'text-am-success' : 'text-am-ink-muted'}`}>
              {(statusReport?.counts.listings || 0) >= 100 ? 'Target satisfied' : 'Needs seed'}
            </span>
          </div>

          {/* Bookings */}
          <div className="p-3 rounded-am-input bg-am-surface-2 border border-am-border">
            <div className="flex items-center justify-between text-am-ink-muted mb-1">
              <span className="text-[10px] font-semibold uppercase">Bookings</span>
              <CalendarCheck className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-heading text-xl font-bold text-am-ink">
                {statusReport?.counts.bookings ?? 0}
              </span>
              <span className="text-[11px] text-am-ink-muted">/ 200 req</span>
            </div>
            <span className={`text-[10px] font-medium ${(statusReport?.counts.bookings || 0) >= 200 ? 'text-am-success' : 'text-am-ink-muted'}`}>
              {(statusReport?.counts.bookings || 0) >= 200 ? 'Target satisfied' : 'Needs seed'}
            </span>
          </div>

          {/* Reviews */}
          <div className="p-3 rounded-am-input bg-am-surface-2 border border-am-border">
            <div className="flex items-center justify-between text-am-ink-muted mb-1">
              <span className="text-[10px] font-semibold uppercase">Reviews</span>
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-heading text-xl font-bold text-am-ink">
                {statusReport?.counts.reviews ?? 0}
              </span>
              <span className="text-[11px] text-am-ink-muted">/ 80 req</span>
            </div>
            <span className={`text-[10px] font-medium ${(statusReport?.counts.reviews || 0) >= 80 ? 'text-am-success' : 'text-am-ink-muted'}`}>
              {(statusReport?.counts.reviews || 0) >= 80 ? 'Target satisfied' : 'Needs seed'}
            </span>
          </div>

          {/* Notifications */}
          <div className="p-3 rounded-am-input bg-am-surface-2 border border-am-border">
            <div className="flex items-center justify-between text-am-ink-muted mb-1">
              <span className="text-[10px] font-semibold uppercase">Notifications</span>
              <Bell className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-heading text-xl font-bold text-am-ink">
                {statusReport?.counts.notifications ?? 0}
              </span>
              <span className="text-[11px] text-am-ink-muted">/ 150 req</span>
            </div>
            <span className={`text-[10px] font-medium ${(statusReport?.counts.notifications || 0) >= 150 ? 'text-am-success' : 'text-am-ink-muted'}`}>
              {(statusReport?.counts.notifications || 0) >= 150 ? 'Target satisfied' : 'Needs seed'}
            </span>
          </div>

          {/* Favourites */}
          <div className="p-3 rounded-am-input bg-am-surface-2 border border-am-border">
            <div className="flex items-center justify-between text-am-ink-muted mb-1">
              <span className="text-[10px] font-semibold uppercase">Favourites</span>
              <Heart className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-heading text-xl font-bold text-am-ink">
                {statusReport?.counts.favourites ?? 0}
              </span>
              <span className="text-[11px] text-am-ink-muted">/ 100 req</span>
            </div>
            <span className={`text-[10px] font-medium ${(statusReport?.counts.favourites || 0) >= 100 ? 'text-am-success' : 'text-am-ink-muted'}`}>
              {(statusReport?.counts.favourites || 0) >= 100 ? 'Target satisfied' : 'Needs seed'}
            </span>
          </div>

          {/* Saved Searches */}
          <div className="p-3 rounded-am-input bg-am-surface-2 border border-am-border">
            <div className="flex items-center justify-between text-am-ink-muted mb-1">
              <span className="text-[10px] font-semibold uppercase">Saved Searches</span>
              <Search className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-heading text-xl font-bold text-am-ink">
                {statusReport?.counts.savedSearches ?? 0}
              </span>
              <span className="text-[11px] text-am-ink-muted">/ 30 req</span>
            </div>
            <span className={`text-[10px] font-medium ${(statusReport?.counts.savedSearches || 0) >= 30 ? 'text-am-success' : 'text-am-ink-muted'}`}>
              {(statusReport?.counts.savedSearches || 0) >= 30 ? 'Target satisfied' : 'Needs seed'}
            </span>
          </div>

          {/* Wishes */}
          <div className="p-3 rounded-am-input bg-am-surface-2 border border-am-border">
            <div className="flex items-center justify-between text-am-ink-muted mb-1">
              <span className="text-[10px] font-semibold uppercase">Wishboard</span>
              <Gift className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-heading text-xl font-bold text-am-ink">
                {statusReport?.counts.wishes ?? 0}
              </span>
              <span className="text-[11px] text-am-ink-muted">/ 50 req</span>
            </div>
            <span className={`text-[10px] font-medium ${(statusReport?.counts.wishes || 0) >= 50 ? 'text-am-success' : 'text-am-ink-muted'}`}>
              {(statusReport?.counts.wishes || 0) >= 50 ? 'Target satisfied' : 'Needs seed'}
            </span>
          </div>

          {/* Public Activity Ledger */}
          <div className="p-3 rounded-am-input bg-am-surface-2 border border-am-border">
            <div className="flex items-center justify-between text-am-ink-muted mb-1">
              <span className="text-[10px] font-semibold uppercase">Historical Events</span>
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-heading text-xl font-bold text-am-ink">
                {statusReport?.counts.publicActivities ?? 0}
              </span>
              <span className="text-[11px] text-am-ink-muted">events</span>
            </div>
            <span className="text-[10px] text-am-success font-medium">180 days history</span>
          </div>

          {/* Seed Status */}
          <div className="p-3 rounded-am-input bg-am-sand/60 border border-am-border flex flex-col justify-between">
            <span className="text-[10px] font-semibold uppercase text-am-ink-muted">Engine Status</span>
            <span className="font-heading text-base font-semibold text-am-primary">
              {statusReport?.isSeeded ? 'Seeded & Online' : 'Awaiting Seed'}
            </span>
            <span className="text-[10px] text-am-ink-muted">
              {statusReport?.isSeeded ? 'Verified operational' : 'Click Generate above'}
            </span>
          </div>
        </div>

        {/* Booking Status Breakdown (All 5 statuses required) */}
        <div className="pt-2 border-t border-am-border">
          <span className="text-xs font-semibold text-am-ink block mb-2">
            Booking Status Distribution (All 5 Required Statuses Represented):
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200">
              <span className="block text-[10px] uppercase font-semibold text-emerald-700 dark:text-emerald-400">
                Completed
              </span>
              <span className="font-heading text-lg font-bold">
                {statusReport?.counts.completedBookings ?? 0}
              </span>
              <span className="block text-[10px] text-emerald-800 dark:text-emerald-300">
                80 reviews linked strictly to these
              </span>
            </div>

            <div className="p-2.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200">
              <span className="block text-[10px] uppercase font-semibold text-blue-700 dark:text-blue-400">
                Approved (Upcoming)
              </span>
              <span className="font-heading text-lg font-bold">
                {statusReport?.counts.approvedBookings ?? 0}
              </span>
              <span className="block text-[10px] text-blue-800 dark:text-blue-300">
                Locked days non-overlapping
              </span>
            </div>

            <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
              <span className="block text-[10px] uppercase font-semibold text-amber-700 dark:text-amber-400">
                Pending (Waiting)
              </span>
              <span className="font-heading text-lg font-bold">
                {statusReport?.counts.pendingBookings ?? 0}
              </span>
              <span className="block text-[10px] text-amber-800 dark:text-amber-300">
                Awaiting owner action
              </span>
            </div>

            <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-900 dark:text-red-200">
              <span className="block text-[10px] uppercase font-semibold text-red-700 dark:text-red-400">
                Cancelled
              </span>
              <span className="font-heading text-lg font-bold">
                {statusReport?.counts.cancelledBookings ?? 0}
              </span>
              <span className="block text-[10px] text-red-800 dark:text-red-300">
                Supports Drop-off Investigator
              </span>
            </div>

            <div className="p-2.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-900 dark:text-purple-200">
              <span className="block text-[10px] uppercase font-semibold text-purple-700 dark:text-purple-400">
                Rejected
              </span>
              <span className="font-heading text-lg font-bold">
                {statusReport?.counts.rejectedBookings ?? 0}
              </span>
              <span className="block text-[10px] text-purple-800 dark:text-purple-300">
                Includes recorded rejection reasons
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        title="Confirm Safe Demo Data Reset"
        message="This will delete exclusively the synthetic records tagged with dataSource: 'demo'. Real accounts, live listings, and actual community bookings will NEVER be touched. Are you sure you wish to proceed?"
        confirmLabel="Reset Demo Data"
        cancelLabel="Keep Data"
        confirmVariant="danger"
        onConfirm={handleReset}
        onClose={() => setShowResetConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showRegenConfirm}
        title="Regenerate Demo Marketplace Dataset"
        message="This will remove current synthetic demo records and regenerate a fresh set of 50 users, 100 listings, and 200 bookings with complete relationship integrity. Real users remain unaffected. Continue?"
        confirmLabel="Regenerate Now"
        cancelLabel="Cancel"
        confirmVariant="primary"
        onConfirm={handleRegenerate}
        onClose={() => setShowRegenConfirm(false)}
      />
    </div>
  );
};
