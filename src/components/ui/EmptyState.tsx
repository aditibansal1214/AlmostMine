import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 md:p-12 border border-dashed border-am-border rounded-am-card bg-am-surface/60 max-w-lg mx-auto my-6">
      <div className="p-3.5 rounded-full bg-am-sand/70 text-am-primary mb-4">
        {icon}
      </div>
      <h3 className="text-base md:text-lg font-semibold text-am-ink mb-1.5">{title}</h3>
      <p className="text-sm text-am-ink-muted leading-relaxed mb-6 max-w-sm">{description}</p>
      <div className="flex items-center gap-3">
        {secondaryActionLabel && onSecondaryAction && (
          <Button variant="ghost" size="md" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
        {actionLabel && onAction && (
          <Button variant="primary" size="md" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};
