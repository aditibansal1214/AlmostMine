import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'sand';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  // Principle: Only ONE filled primary green button per screen.
  const variantStyles = {
    primary:
      'bg-am-primary text-am-on-primary hover:bg-am-primary-hover shadow-sm border border-transparent disabled:opacity-40 disabled:pointer-events-none',
    secondary:
      'bg-am-surface text-am-ink border border-am-border hover:bg-am-surface-2 disabled:opacity-40 disabled:pointer-events-none',
    ghost:
      'bg-transparent text-am-ink-muted hover:text-am-ink hover:bg-am-surface-2 border border-transparent disabled:opacity-40 disabled:pointer-events-none',
    danger:
      'bg-am-danger text-white hover:opacity-90 border border-transparent disabled:opacity-40 disabled:pointer-events-none',
    sand:
      'bg-am-sand text-am-ink hover:opacity-90 border border-transparent disabled:opacity-40 disabled:pointer-events-none',
  };

  const sizeStyles = {
    sm: 'text-xs h-9 px-3 gap-1.5 rounded-am-input min-w-[36px]',
    md: 'text-sm h-11 px-4 gap-2 rounded-am-input min-h-[44px]',
    lg: 'text-base h-12 px-6 gap-2.5 rounded-am-input min-h-[48px]',
    icon: 'h-11 w-11 p-0 rounded-am-input min-h-[44px] min-w-[44px] justify-center items-center',
  };

  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-am-primary focus-visible:ring-offset-2 select-none active:scale-[0.99] cursor-pointer ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          {size !== 'icon' && children && <span>{children}</span>}
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};
