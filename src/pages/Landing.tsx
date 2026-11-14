import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { Button } from '../components/ui/Button';
import { ListingCard } from '../components/ui/ListingCard';
import { Listing } from '../domain/types';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Shield, Sparkles, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';

export const Landing: React.FC = () => {
  const { currentUser, signInWithGoogle, userPrivate } = useAuth();
  const navigate = useNavigate();
  const [featuredListings, setFeaturedListings] = useState<Listing[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (currentUser) {
      if (userPrivate && !userPrivate.onboarding?.done) {
        navigate('/onboarding');
      } else {
        navigate('/');
      }
    }
  }, [currentUser, userPrivate, navigate]);

  useEffect(() => {
    async function fetchFeatured() {
      try {
        const q = query(
          collection(db, 'listings'),
          where('status', '==', 'active'),
          limit(6)
        );
        const snap = await getDocs(q);
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Listing));
        setFeaturedListings(items);
      } catch (err) {
        console.warn('Notice: featured listings preview:', err);
      } finally {
        setLoadingItems(false);
      }
    }
    fetchFeatured();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setSigningIn(true);
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Sign-in failed:', err);
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="flex flex-col gap-16 md:gap-24 py-6 md:py-12 text-center items-center">
      {/* Hero Section */}
      <section className="flex flex-col items-center max-w-3xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-am-sand/80 text-am-ink text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5 text-am-accent" />
          <span>Community Sharing & Rental</span>
        </div>

        <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-semibold text-am-ink tracking-tight leading-[1.1] mb-6">
          Own less. <span className="text-am-primary italic">Access more.</span>
        </h1>

        <p className="text-lg md:text-xl text-am-ink-muted leading-relaxed max-w-2xl mb-8">
          Borrow or rent cameras, tools, camping gear, and event supplies from verified neighbors in your community—or list what sits idle in your home and earn safely.
        </p>

        {/* Primary Call to Action */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Button
            variant="primary"
            size="lg"
            loading={signingIn}
            onClick={handleGoogleSignIn}
            className="w-full sm:w-auto px-8"
          >
            Sign in with Google
          </Button>
          <Link to="/how-it-works" className="w-full sm:w-auto">
            <Button variant="secondary" size="lg" className="w-full sm:w-auto">
              How it works
            </Button>
          </Link>
        </div>

        {/* Trust badge */}
        <p className="text-xs text-am-ink-muted mt-4">
          Peer-to-peer trust • Zero subscription fee • INR currency
        </p>
      </section>

      {/* 3-Step "How It Works" Section */}
      <section className="w-full max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="font-heading text-2xl md:text-3xl font-semibold text-am-ink mb-2">
            Simple, calm community sharing
          </h2>
          <p className="text-sm text-am-ink-muted">Three straightforward steps from request to return</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {/* Step 1 */}
          <div className="p-6 rounded-am-card border border-am-border bg-am-surface shadow-am-soft flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-full bg-am-sand text-am-primary font-heading font-semibold text-lg flex items-center justify-center mb-4">
                1
              </div>
              <h3 className="font-heading text-lg font-semibold text-am-ink mb-2">Find or list nearby</h3>
              <p className="text-sm text-am-ink-muted leading-relaxed">
                Browse tools, cameras, and luggage already idle in your apartment complex or campus. Or snap 3 photos and list your own in under a minute.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-am-border/60 text-xs text-am-ink font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-am-success" />
              <span>Fair-price & idle value guidance</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-am-card border border-am-border bg-am-surface shadow-am-soft flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-full bg-am-sand text-am-primary font-heading font-semibold text-lg flex items-center justify-center mb-4">
                2
              </div>
              <h3 className="font-heading text-lg font-semibold text-am-ink mb-2">Request with calendar lock</h3>
              <p className="text-sm text-am-ink-muted leading-relaxed">
                Choose dates on an interactive calendar. When an owner approves, dates are locked instantly so no double-booking is ever possible.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-am-border/60 text-xs text-am-ink font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-am-success" />
              <span>Direct communication & clear rules</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-am-card border border-am-border bg-am-surface shadow-am-soft flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-full bg-am-sand text-am-primary font-heading font-semibold text-lg flex items-center justify-center mb-4">
                3
              </div>
              <h3 className="font-heading text-lg font-semibold text-am-ink mb-2">Handover & return checklist</h3>
              <p className="text-sm text-am-ink-muted leading-relaxed">
                Both parties review a category-tailored checklist at handover and return. Mark returned to record verified trust on your profile.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-am-border/60 text-xs text-am-ink font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-am-success" />
              <span>Transparent community trust ledger</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Items Preview (Read-only, 6 items) */}
      <section className="w-full max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="text-left">
            <h2 className="font-heading text-xl md:text-2xl font-semibold text-am-ink">
              Featured community items
            </h2>
            <p className="text-xs text-am-ink-muted">Available to borrow or rent in local clusters</p>
          </div>
          <button
            onClick={handleGoogleSignIn}
            className="text-xs font-semibold text-am-primary hover:underline flex items-center gap-1"
          >
            <span>Sign in to browse all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loadingItems ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-4/3 rounded-am-card bg-am-surface-2 animate-pulse" />
            ))}
          </div>
        ) : featuredListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-left">
            {featuredListings.map((item) => (
              <ListingCard key={item.id} listing={item} />
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-am-card border border-am-border bg-am-surface/60 text-center max-w-md mx-auto">
            <p className="text-sm text-am-ink-muted mb-4">
              Sign in to list the first item in your community!
            </p>
            <Button variant="primary" size="md" onClick={handleGoogleSignIn}>
              Get Started
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};
