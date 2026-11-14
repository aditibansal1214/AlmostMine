import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-am-border bg-am-surface/50 text-am-ink-muted text-xs py-8 px-4 mt-16 mb-16 md:mb-0">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
        <div className="flex flex-col gap-1">
          <p className="font-heading font-semibold text-am-ink text-sm">
            AlmostMine — Own less. Access more.
          </p>
          <p className="max-w-md text-[11px] leading-relaxed text-am-ink-muted">
            Payments are arranged directly between users. AlmostMine does not process payments, verify identity, or insure items.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium">
          <Link to="/how-it-works" className="hover:text-am-ink transition">
            How it works
          </Link>
          <span>•</span>
          <Link to="/legal" className="hover:text-am-ink transition">
            Legal & Terms
          </Link>
          <span>•</span>
          <Link to="/admin" className="hover:text-am-ink transition">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
};
