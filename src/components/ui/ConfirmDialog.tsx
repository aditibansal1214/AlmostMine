import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertCircle } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  requiredInputText?: string;
  inputPlaceholder?: string;
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  requiredInputText,
  inputPlaceholder,
  loading = false,
}) => {
  const [typedValue, setTypedValue] = useState('');

  const canConfirm = !requiredInputText || typedValue.trim() === requiredInputText;

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm();
      setTypedValue('');
    }
  };

  const handleClose = () => {
    setTypedValue('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidth="sm" isSheetOnMobile={false}>
      <div className="flex flex-col items-center text-center p-2">
        <div
          className={`p-3 rounded-full mb-3 ${
            confirmVariant === 'danger'
              ? 'bg-am-danger/15 text-am-danger'
              : 'bg-am-sand text-am-primary'
          }`}
        >
          <AlertCircle className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-heading font-semibold text-am-ink mb-2">{title}</h3>
        <p className="text-sm text-am-ink-muted leading-relaxed mb-4">{message}</p>

        {requiredInputText && (
          <div className="w-full mb-5 text-left">
            <label className="text-xs font-semibold text-am-ink-muted mb-1 block">
              Type <strong className="text-am-ink">{requiredInputText}</strong> to confirm:
            </label>
            <input
              type="text"
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              placeholder={inputPlaceholder || requiredInputText}
              className="w-full bg-am-surface text-am-ink text-sm h-11 px-3.5 rounded-am-input border border-am-border focus:outline-none focus:ring-1 focus:ring-am-primary"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 w-full">
          <Button variant="secondary" size="md" onClick={handleClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            size="md"
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
