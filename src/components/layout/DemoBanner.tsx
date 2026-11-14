import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, X, Database, ShieldAlert, ArrowRight, Eye, RefreshCw } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/authContext';

export const DemoBanner: React.FC = () => {
  const [demoActive, setDemoActive] = useState<boolean>(true);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [itemCount, setItemCount] = useState<number>(100);
  const location = useLocation();
  const { currentUser } = useAuth();

  useEffect(() => {
    // Check global app config
    async function checkConfig() {
      try {
        const snap = await getDoc(doc(db, 'appConfig', 'global'));
        if (snap.exists()) {
          const cfg = snap.data();
          if (cfg.demoModeActive !== undefined) {
            setDemoActive(cfg.demoModeActive);
          }
        }
      } catch (err) {
        // Fallback default is active for demo experience
      }
    }
    checkConfig();
  }, [location.pathname]);

  if (!demoActive || dismissed) return null;

  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <aside aria-label="Demo mode announcement" className="bg-amber-500/10 border-b border-amber-500/30 text-amber-950 dark:text-amber-200 px-4 py-2 text-xs transition-all">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600"></span>
          </span>
          <div className="flex items-center gap-1.5 font-medium">
            <Database className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
            <span className="font-semibold text-amber-900 dark:text-amber-100">Demo Mode Active:</span>
            <span className="text-amber-800/90 dark:text-amber-300">
              Showing isolated synthetic marketplace records (50 users, 100 listings, 200 bookings, 8 analytics models).
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <Link
            to="/admin/demo"
            className="font-semibold text-amber-900 dark:text-amber-100 underline decoration-amber-400 hover:text-amber-950 dark:hover:text-amber-50 flex items-center gap-1"
          >
            Manage Demo Studio <ArrowRight className="w-3 h-3" />
          </Link>

          <Link
            to="/admin/analytics"
            className="hidden sm:flex font-semibold text-amber-900 dark:text-amber-100 hover:underline items-center gap-1"
          >
            Analytics <ArrowRight className="w-3 h-3" />
          </Link>

          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded hover:bg-amber-500/20 text-amber-800 dark:text-amber-300"
            title="Dismiss banner"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
