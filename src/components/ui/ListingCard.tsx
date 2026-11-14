import React from 'react';
import { Link } from 'react-router-dom';
import { Listing } from '../../domain/types';
import { formatINR } from '../../domain/rules';
import { MapPin, Repeat, Clock, Image as ImageIcon } from 'lucide-react';

export interface ListingCardProps {
  listing: Listing;
  isOwner?: boolean;
  miniStats?: {
    requestsCount: number;
    completedCount: number;
    earnedTotal: number;
    daysIdle?: number;
  };
  onPauseToggle?: () => void;
  onRemove?: () => void;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  isOwner = false,
  miniStats,
  onPauseToggle,
  onRemove,
}) => {
  const photo = listing.images && listing.images.length > 0 ? listing.images[0] : null;

  const targetUrl = isOwner ? `/items/${listing.id}` : `/listing/${listing.id}`;

  const statusColors = {
    active: 'bg-am-success/15 text-am-success border-am-success/30',
    paused: 'bg-am-warning/15 text-am-warning border-am-warning/30',
    draft: 'bg-am-surface-2 text-am-ink-muted border-am-border',
    removed: 'bg-am-danger/15 text-am-danger border-am-danger/30',
  };

  return (
    <div className="group rounded-am-card border border-am-border bg-am-surface overflow-hidden shadow-am-soft transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between">
      <div>
        {/* Photo 4:3 aspect ratio */}
        <Link to={targetUrl} className="block relative aspect-4/3 w-full bg-am-surface-2 overflow-hidden">
          {photo ? (
            <img
              src={photo}
              alt={listing.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-am-ink-muted/50 p-4">
              <ImageIcon className="w-8 h-8 mb-1" />
              <span className="text-xs">No photo</span>
            </div>
          )}

          {/* Pricing / Type Badge */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            {listing.transactionType === 'rent' ? (
              <span className="bg-am-surface/95 backdrop-blur-xs text-am-ink text-xs font-semibold px-2.5 py-1 rounded-full shadow-xs border border-am-border/60">
                {formatINR(listing.pricePerDay)} <span className="font-normal text-am-ink-muted text-[10px]">/ day</span>
              </span>
            ) : listing.transactionType === 'free lend' ? (
              <span className="bg-am-primary text-am-on-primary text-xs font-semibold px-2.5 py-1 rounded-full shadow-xs">
                Free Lend
              </span>
            ) : (
              <span className="bg-am-accent text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-xs">
                Swap
              </span>
            )}
          </div>

          {/* Status Chip (if owner) or Demo Chip */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
            {(listing.dataSource === 'demo' || (listing as any).isDemo) && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/90 text-white shadow-xs uppercase tracking-wider backdrop-blur-xs">
                Demo
              </span>
            )}
            {isOwner && (
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border uppercase tracking-wider backdrop-blur-xs ${
                  statusColors[listing.status] || statusColors.draft
                }`}
              >
                {listing.status}
              </span>
            )}
          </div>
        </Link>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center gap-1 text-[11px] text-am-ink-muted uppercase tracking-wider mb-1 truncate">
            <span className="truncate">{listing.category}</span>
            <span>•</span>
            <span className="shrink-0">{listing.condition}</span>
          </div>

          <Link to={targetUrl} className="block group-hover:text-am-primary transition">
            <h3 className="font-medium text-base text-am-ink line-clamp-1 leading-snug mb-1">
              {listing.title}
            </h3>
          </Link>

          <div className="flex items-center gap-1 text-xs text-am-ink-muted mt-2">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{listing.locality || 'Nearby'}</span>
          </div>
        </div>
      </div>

      {/* Owner Mini Stats (if owner view) */}
      {isOwner && miniStats && (
        <div className="px-4 py-3 border-t border-am-border bg-am-surface-2/50 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <span className="block text-[10px] uppercase font-semibold text-am-ink-muted">Requests</span>
            <span className="font-semibold text-am-ink">{miniStats.requestsCount}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-semibold text-am-ink-muted">Completed</span>
            <span className="font-semibold text-am-ink">{miniStats.completedCount}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-semibold text-am-ink-muted">Earned</span>
            <span className="font-semibold text-am-ink">{formatINR(miniStats.earnedTotal)}</span>
          </div>
        </div>
      )}

      {/* Owner quick actions */}
      {isOwner && (onPauseToggle || onRemove) && (
        <div className="px-4 py-2 border-t border-am-border flex items-center justify-between text-xs">
          <Link to={`/items/${listing.id}`} className="text-am-primary font-medium hover:underline">
            Edit details
          </Link>
          <div className="flex items-center gap-3">
            {onPauseToggle && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onPauseToggle();
                }}
                className="text-am-ink-muted hover:text-am-ink font-medium"
              >
                {listing.status === 'paused' ? 'Resume' : 'Pause'}
              </button>
            )}
            {onRemove && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onRemove();
                }}
                className="text-am-danger hover:opacity-80 font-medium"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
