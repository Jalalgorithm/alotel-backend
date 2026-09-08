import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';

/**
 * A required-reason confirmation popup — reused by every "collect a reason,
 * then do something destructive/consequential" flow (cancel a booking, issue
 * a refund) so they stay visually and behaviorally consistent instead of each
 * screen growing its own slightly-different copy.
 */
export const ReasonModal = ({
  isOpen,
  title,
  description,
  helperText,
  reasonLabel = 'Reason',
  reasonPlaceholder = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  isPending = false,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');

  // Fresh box every time the popup opens — a leftover reason from a
  // previously-cancelled attempt (on this or a different row) shouldn't
  // silently carry over.
  useEffect(() => {
    if (isOpen) setReason('');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="sm"
      title={title}
      description={description}
      footer={
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={onClose} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button
            size="sm"
            variant={confirmVariant}
            isLoading={isPending}
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason.trim())}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {helperText && <p className="text-[12.5px] text-ink-muted">{helperText}</p>}
      <Textarea
        label={reasonLabel}
        rows={3}
        placeholder={reasonPlaceholder}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        containerClassName={helperText ? 'mt-3' : undefined}
      />
    </Modal>
  );
};
