import React from 'react';
import { ShieldAlert, AlertCircle } from 'lucide-react';

export const Legal: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 flex flex-col gap-6 text-left">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-semibold text-am-ink">
          Legal Terms & Disclaimers
        </h1>
        <p className="text-xs text-am-ink-muted mt-1">Last updated: November 2026</p>
      </div>

      {/* Prominent Mandatory Disclosure */}
      <div className="p-4 rounded-am-card border border-am-border bg-am-sand/40 text-am-ink">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-am-primary shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <h3 className="font-semibold text-sm mb-1">Direct User Settlement</h3>
            <p>
              Payments are arranged directly between users. AlmostMine does not process payments, verify identity, or insure items.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 text-xs text-am-ink-muted leading-relaxed">
        <section className="p-5 rounded-am-card border border-am-border bg-am-surface">
          <h3 className="font-heading text-sm font-semibold text-am-ink mb-2">
            1. Platform Role & Limitations
          </h3>
          <p>
            AlmostMine provides an introductory platform for members of residential clusters, campuses, and neighborhoods to coordinate the temporary sharing, borrowing, and renting of personal items. AlmostMine is not an insurer, rental agency, escrow agent, or financial intermediary.
          </p>
        </section>

        <section className="p-5 rounded-am-card border border-am-border bg-am-surface">
          <h3 className="font-heading text-sm font-semibold text-am-ink mb-2">
            2. Payments & Financial Transactions
          </h3>
          <p>
            Any rental fees, deposits, or replacement compensations agreed upon in the application are settled directly between owner and borrower outside of AlmostMine (e.g., in cash, bank transfer, or UPI). Recorded totals and earnings visible in the app reflect agreement records, not money processed or held by the platform.
          </p>
        </section>

        <section className="p-5 rounded-am-card border border-am-border bg-am-surface">
          <h3 className="font-heading text-sm font-semibold text-am-ink mb-2">
            3. Condition, Inspection & Checklists
          </h3>
          <p>
            The Smart Exchange Checklist provided during handover and return records what both parties acknowledged at that specific time. It does not independently certify an item's condition or serve as legal warranty. Users are encouraged to inspect all equipment thoroughly prior to acceptance.
          </p>
        </section>

        <section className="p-5 rounded-am-card border border-am-border bg-am-surface">
          <h3 className="font-heading text-sm font-semibold text-am-ink mb-2">
            4. Cancellation Policy
          </h3>
          <p>
            Borrowers may cancel pending requests freely. Confirmed bookings can be cancelled without penalty up to 48 hours before the start date. Cancellations made under 48 hours or by owners of confirmed bookings are transparently recorded on public Community Trust Profiles.
          </p>
        </section>

        <section className="p-5 rounded-am-card border border-am-border bg-am-surface">
          <h3 className="font-heading text-sm font-semibold text-am-ink mb-2">
            5. Privacy & User Data
          </h3>
          <p>
            Your email and phone number are stored strictly in private user records. They are never published publicly, sold, or shared with third parties. Only your display name, chosen username, bio, and general cluster locality appear on public listings.
          </p>
        </section>
      </div>
    </div>
  );
};
