import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/authContext';
import { usePWAInstall } from '../../lib/pwa';
import { Home, Compass, Package, Inbox, User as UserIcon, Bell, Plus, Download } from 'lucide-react';
import { Button } from '../ui/Button';

export const Navbar: React.FC = () => {
  const { currentUser, publicProfile } = useAuth();
  const location = useLocation();
  const { canInstall, isStandalone, triggerInstall } = usePWAInstall();

  const navLinks = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Browse', href: '/browse', icon: Compass },
    { label: 'My Items', href: '/items', icon: Package },
    { label: 'Requests', href: '/requests', icon: Inbox },
    { label: 'Me', href: '/me', icon: UserIcon },
  ];

  return (
    <header className="sticky top-0 z-40 bg-am-surface/90 backdrop-blur-md border-b border-am-border safe-top">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand logo & tagline */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 focus-visible:outline-none">
          <div className="w-8 h-8 rounded-lg bg-am-primary flex items-center justify-center text-am-on-primary font-heading font-semibold text-sm shadow-xs">
            AM
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-semibold text-lg text-am-ink tracking-tight leading-none">
              AlmostMine
            </span>
            <span className="text-[10px] text-am-ink-muted hidden sm:block">Own less. Access more.</span>
          </div>
        </Link>

        {/* Desktop Primary Nav (5 items) */}
        {currentUser && (
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                link.href === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-am-input text-sm font-medium transition ${
                    isActive
                      ? 'bg-am-sand text-am-ink font-semibold'
                      : 'text-am-ink-muted hover:text-am-ink hover:bg-am-surface-2'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Action icons / profile / install */}
        <div className="flex items-center gap-2">
          {/* PWA Install Button (if available and not already standalone) */}
          {canInstall && !isStandalone && (
            <button
              onClick={triggerInstall}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-am-input bg-am-sand text-am-primary hover:bg-am-sand/80 transition"
              aria-label="Install AlmostMine app"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}

          {currentUser ? (
            <>
              {/* Add item button on desktop */}
              <Link to="/items/new" className="hidden md:inline-flex">
                <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
                  Add item
                </Button>
              </Link>

              {/* Notifications */}
              <Link
                to="/notifications"
                className="p-2 text-am-ink-muted hover:text-am-ink hover:bg-am-surface-2 rounded-full transition relative"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
              </Link>

              {/* Profile Avatar / Initials */}
              <Link
                to="/me"
                className="w-8 h-8 rounded-full border border-am-border bg-am-surface-2 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-am-primary transition shrink-0"
                aria-label="My Account"
              >
                {publicProfile?.avatarUrl ? (
                  <img
                    src={publicProfile.avatarUrl}
                    alt={publicProfile.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold text-am-ink">
                    {(publicProfile?.displayName || 'M').charAt(0).toUpperCase()}
                  </span>
                )}
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/how-it-works" className="text-xs text-am-ink-muted hover:text-am-ink px-2 py-1">
                How it works
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
