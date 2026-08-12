import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';

/** Reject requires a reason server-side — the row stays in the table (not deleted) for audit history. */
export const RejectRuleModal = ({ rule, onClose, onReject, isSaving }) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    setReason('');
  }, [rule?.id]);

  return (
    <Modal
      isOpen={Boolean(rule)}
      onClose={onClose}
      title={`Reject ${rule?.ruleName || rule?.country}`}
      description="Kept in the table, not deleted — for audit history."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" isLoading={isSaving} disabled={!reason.trim()} onClick={() => onReject(reason.trim())}>
            Reject rule
          </Button>
        </div>
      }
    >
      <Textarea
        label="Reason (required)"
        placeholder="e.g. Rate looks outdated — city site now shows 6%."
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
    </Modal>
  );
};
