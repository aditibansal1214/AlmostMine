import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  isSheetOnMobile?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  isSheetOnMobile = true,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal_title' : undefined}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs transition-opacity"
    >
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal / Sheet container */}
      <div
        className={`relative w-full ${maxWidthClasses[maxWidth]} bg-am-surface border border-am-border text-am-ink shadow-am-soft overflow-hidden z-10 transition-transform ${
          isSheetOnMobile
            ? 'rounded-t-am-sheet sm:rounded-am-card max-h-[90dvh] flex flex-col'
            : 'rounded-am-card max-h-[90vh] flex flex-col'
        }`}
      >
        {/* Mobile handle indicator */}
        {isSheetOnMobile && (
          <div className="sm:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-am-border" />
          </div>
        )}

        {/* Header */}
        {(title || description) && (
          <div className="px-5 pt-4 pb-3 flex items-start justify-between border-b border-am-border">
            <div>
              {title && (
                <h3 id="modal_title" className="text-lg font-semibold tracking-tight text-am-ink">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-am-ink-muted mt-0.5">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1.5 text-am-ink-muted hover:text-am-ink hover:bg-am-surface-2 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
