import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, Plus, Inbox, User } from 'lucide-react';
import { useAuth } from '../../lib/authContext';

export const BottomTabs: React.FC = () => {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) return null;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-am-surface/95 backdrop-blur-md border-t border-am-border safe-bottom"
      aria-label="Mobile Navigation"
    >
      <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto">
        {/* 1. Home */}
        <Link
          to="/"
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium transition ${
            isActive('/') ? 'text-am-primary font-semibold' : 'text-am-ink-muted'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </Link>

        {/* 2. Browse */}
        <Link
          to="/browse"
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium transition ${
            isActive('/browse') ? 'text-am-primary font-semibold' : 'text-am-ink-muted'
          }`}
        >
          <Compass className="w-5 h-5 mb-0.5" />
          <span>Browse</span>
        </Link>

        {/* 3. Centered Add Button */}
        <div className="flex-1 flex justify-center items-center">
          <Link
            to="/items/new"
            aria-label="Add new item"
            className="w-12 h-12 rounded-full bg-am-primary text-am-on-primary flex items-center justify-center shadow-md active:scale-95 transition"
          >
            <Plus className="w-6 h-6" />
          </Link>
        </div>

        {/* 4. Requests */}
        <Link
          to="/requests"
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium transition ${
            isActive('/requests') ? 'text-am-primary font-semibold' : 'text-am-ink-muted'
          }`}
        >
          <Inbox className="w-5 h-5 mb-0.5" />
          <span>Requests</span>
        </Link>

        {/* 5. Me */}
        <Link
          to="/me"
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium transition ${
            isActive('/me') || isActive('/settings')
              ? 'text-am-primary font-semibold'
              : 'text-am-ink-muted'
          }`}
        >
          <User className="w-5 h-5 mb-0.5" />
          <span>Me</span>
        </Link>
      </div>
    </nav>
  );
};
