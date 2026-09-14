import { useEffect, useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/utils/format';
import { useGuidebook, useSaveGuidebook } from '../hooks/useProperties';

const emptyValues = () => ({
  wifiName: '',
  wifiPassword: '',
  smartLockCode: '',
  checkinInstructions: '',
  checkoutInstructions: '',
  houseRules: '',
  localTips: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
});

/**
 * Guest-facing info sheet for one property — WiFi, lock code, check-in/out
 * instructions, house rules, local tips, an emergency contact.
 * `GET/PUT /stay/guidebook/<property_id>/`, `PUT` is a safe upsert whether or
 * not a row exists yet, so this tab never needs to know which case it's in.
 */
export const GuidebookTab = ({ propertyId, canManage }) => {
  const { data: guidebook, isLoading } = useGuidebook(propertyId);
  const { saveGuidebook, isSaving } = useSaveGuidebook();

  const [form, setForm] = useState(emptyValues());

  // Re-seed local state whenever the saved record changes (first load, or
  // after a save round-trips) — never while the admin still has unsaved edits.
  useEffect(() => {
    if (guidebook) {
      setForm({
        wifiName: guidebook.wifiName,
        wifiPassword: guidebook.wifiPassword,
        smartLockCode: guidebook.smartLockCode,
        checkinInstructions: guidebook.checkinInstructions,
        checkoutInstructions: guidebook.checkoutInstructions,
        houseRules: guidebook.houseRules,
        localTips: guidebook.localTips,
        emergencyContactName: guidebook.emergencyContactName,
        emergencyContactPhone: guidebook.emergencyContactPhone,
      });
    }
  }, [guidebook]);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  if (isLoading) {
    return (
      <Card className="p-5">
        <Skeleton className="h-64 w-full" />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Guidebook"
        subtitle="What a checked-in guest sees — WiFi, lock code, instructions and local tips."
        action={
          guidebook?.updatedAt && (
            <span className="text-[11px] text-ink-muted">Last saved {formatDate(guidebook.updatedAt, "d MMM yyyy, HH:mm")}</span>
          )
        }
      />

      <div className="space-y-5 border-t border-line p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input label="WiFi network" value={form.wifiName} onChange={set('wifiName')} disabled={!canManage} />
          <Input label="WiFi password" value={form.wifiPassword} onChange={set('wifiPassword')} disabled={!canManage} />
          <Input label="Smart lock code" value={form.smartLockCode} onChange={set('smartLockCode')} disabled={!canManage} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Textarea
            label="Check-in instructions"
            rows={4}
            value={form.checkinInstructions}
            onChange={set('checkinInstructions')}
            disabled={!canManage}
          />
          <Textarea
            label="Check-out instructions"
            rows={4}
            value={form.checkoutInstructions}
            onChange={set('checkoutInstructions')}
            disabled={!canManage}
          />
        </div>

        <Textarea label="House rules" rows={4} value={form.houseRules} onChange={set('houseRules')} disabled={!canManage} />
        <Textarea
          label="Local tips & recommendations"
          rows={4}
          value={form.localTips}
          onChange={set('localTips')}
          disabled={!canManage}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Emergency contact name"
            value={form.emergencyContactName}
            onChange={set('emergencyContactName')}
            disabled={!canManage}
          />
          <Input
            label="Emergency contact phone"
            value={form.emergencyContactPhone}
            onChange={set('emergencyContactPhone')}
            disabled={!canManage}
          />
        </div>

        {canManage && (
          <div className="flex justify-end border-t border-line pt-4">
            <Button variant="primary" isLoading={isSaving} onClick={() => saveGuidebook({ propertyId, ...form })}>
              Save guidebook
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
