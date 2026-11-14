import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { CheckCircle2, Shield, Calendar, Users, RefreshCw } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 flex flex-col gap-10 text-left">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-am-ink mb-3">
          How AlmostMine Works
        </h1>
        <p className="text-sm md:text-base text-am-ink-muted leading-relaxed">
          AlmostMine is a calm, peer-to-peer sharing network that helps you access everyday tools, creator gear, and travel equipment from neighbors you live alongside.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 rounded-am-card border border-am-border bg-am-surface shadow-am-soft">
          <div className="w-10 h-10 rounded-full bg-am-sand text-am-primary flex items-center justify-center font-heading font-semibold text-base mb-3">
            1
          </div>
          <h3 className="font-heading text-base font-semibold text-am-ink mb-1.5">
            List or Search
          </h3>
          <p className="text-xs text-am-ink-muted leading-relaxed">
            Snap photos of what sits idle in your closet or garage. Set your own terms: rent per day, free lend to neighbors, or swap for other gear.
          </p>
        </div>

        <div className="p-5 rounded-am-card border border-am-border bg-am-surface shadow-am-soft">
          <div className="w-10 h-10 rounded-full bg-am-sand text-am-primary flex items-center justify-center font-heading font-semibold text-base mb-3">
            2
          </div>
          <h3 className="font-heading text-base font-semibold text-am-ink mb-1.5">
            Atomic Calendar Lock
          </h3>
          <p className="text-xs text-am-ink-muted leading-relaxed">
            Borrowers pick dates on an interactive calendar. When an owner approves, dates are locked synchronously on the database so double-booking is strictly impossible.
          </p>
        </div>

        <div className="p-5 rounded-am-card border border-am-border bg-am-surface shadow-am-soft">
          <div className="w-10 h-10 rounded-full bg-am-sand text-am-primary flex items-center justify-center font-heading font-semibold text-base mb-3">
            3
          </div>
          <h3 className="font-heading text-base font-semibold text-am-ink mb-1.5">
            Smart Exchange & Return
          </h3>
          <p className="text-xs text-am-ink-muted leading-relaxed">
            Use our category-specific checklist to verify condition at pickup and return. When marked returned, immutable trust indicators update on your profile.
          </p>
        </div>
      </div>

      <div className="p-6 rounded-am-card border border-am-border bg-am-surface shadow-am-soft flex flex-col gap-3">
        <div className="flex items-center gap-2 text-am-ink">
          <Shield className="w-5 h-5 text-am-primary" />
          <h3 className="font-heading text-base font-semibold">Community Trust Principles</h3>
        </div>
        <ul className="text-xs text-am-ink-muted flex flex-col gap-2.5">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-am-success shrink-0 mt-0.5" />
            <span>
              <strong>Direct peer settlement:</strong> Payments are agreed and handled directly between owner and borrower (cash, UPI, or barter). AlmostMine does not process payments or deduct hidden platform fees.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-am-success shrink-0 mt-0.5" />
            <span>
              <strong>Zero fake claims:</strong> AlmostMine does not offer third-party insurance or damage guarantees. Trust is maintained through neighbor reputation, verified profiles, and checklist agreements.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-am-success shrink-0 mt-0.5" />
            <span>
              <strong>Fair cancellation:</strong> Requests can be cancelled freely until 48 hours prior to start. Cancellations within 48 hours are noted transparently on Community Trust Profiles.
            </span>
          </li>
        </ul>
      </div>

      <div className="text-center pt-2">
        <Link to="/browse">
          <Button variant="primary" size="md">
            Browse Community Items
          </Button>
        </Link>
      </div>
    </div>
  );
};
