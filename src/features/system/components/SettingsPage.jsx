import { useState } from 'react';
import { Bell, CreditCard, FileSignature, Megaphone, Plug, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { ToggleRow } from '@/components/ui/Toggle';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAnnouncements, useCreateAnnouncement, useSaveSettings, useSettings } from '../hooks/useSystem';
import { useAuth } from '@/features/auth';
import { ROLES } from '@/lib/mock/people';
import { formatDate } from '@/utils/format';

const SECTION_ICONS = {
  notifications: Bell,
  security: ShieldCheck,
  payments: CreditCard,
  contracts: FileSignature,
  integrations: Plug,
  announcements: Megaphone,
};

/** Super Admin only — `POST /admin/announcements/` is `IsSuperAdmin` server-side. */
const AnnouncementsSection = () => {
  const { data: announcements = [], isLoading } = useAnnouncements();
  const { createAnnouncement, isPending } = useCreateAnnouncement();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const submit = (event) => {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    createAnnouncement(
      { title: title.trim(), body: body.trim() },
      { onSuccess: () => { setTitle(''); setBody(''); } },
    );
  };

  return (
    <Section id="announcements" title="Announcements" subtitle="Posted to every admin's dashboard.">
      <form onSubmit={submit} className="space-y-3 px-4 py-3.5">
        <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="System Update" />
        <Textarea label="Message" value={body} onChange={(event) => setBody(event.target.value)} placeholder="What changed and why it matters." />
        <Button type="submit" variant="primary" size="sm" isLoading={isPending} disabled={!title.trim() || !body.trim()}>
          Post announcement
        </Button>
      </form>

      <div className="px-4 py-3.5">
        {isLoading ? (
          <Skeleton className="h-16 rounded-lg" />
        ) : announcements.length ? (
          <ul className="space-y-2.5">
            {announcements.map((entry) => (
              <li key={entry.id} className="rounded-lg border border-line bg-canvas p-3">
                <p className="text-[12.5px] font-semibold text-ink">{entry.title}</p>
                <p className="mt-0.5 text-[11.5px] text-ink-muted">{entry.body}</p>
                <p className="mt-1 text-[10.5px] text-ink-muted">{formatDate(entry.createdAt)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No announcements yet" description="Post one above — it appears on every admin's dashboard." />
        )}
      </div>
    </Section>
  );
};

const Section = ({ id, title, subtitle, children }) => {
  const Icon = SECTION_ICONS[id] ?? Bell;

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Icon className="size-4 text-brand-600" aria-hidden="true" />
            {title}
          </span>
        }
        subtitle={subtitle}
      />
      <div className="divide-y divide-line border-t border-line">{children}</div>
    </Card>
  );
};

/** Portal configuration. Every control saves immediately. */
export const SettingsPage = () => {
  const { user } = useAuth();
  const { data, isLoading } = useSettings();
  const { saveSettings } = useSaveSettings();

  const role = ROLES.find((entry) => entry.id === user?.role);
  const settings = data?.settings;

  const set = (key) => (value) => saveSettings({ [key]: value });
  const setValue = (key) => (event) => saveSettings({ [key]: event.target.value });

  if (isLoading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Settings" />
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-48 rounded-card" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader title="Settings" subtitle="Portal configuration, security posture and connected services." />

      {/* Account */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Avatar name={user?.name} initials={user?.initials} color={role?.color} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-ink">{user?.name}</p>
            <p className="truncate text-[11.5px] text-ink-muted">{user?.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={user?.role === 'L1' ? 'ok' : 'info'}>
              {role?.level} — {role?.name}
            </Badge>
            <Badge variant="neutral">{user?.regions}</Badge>
            {user?.joinedAt && <Badge variant="neutral">Since {formatDate(user.joinedAt, 'MMM yyyy')}</Badge>}
          </div>
        </div>
      </Card>

      <Section id="notifications" title="Notifications & alerts" subtitle="How the portal reaches you.">
        <ToggleRow
          title="Email notifications"
          description="Booking confirmations, KYC alerts and contract status"
          checked={settings.notifyEmail}
          onChange={set('notifyEmail')}
        />
        <ToggleRow
          title="SMS notifications"
          description="Check-in reminders and urgent alerts"
          checked={settings.notifySms}
          onChange={set('notifySms')}
        />
        <ToggleRow
          title="In-app notifications"
          description="Real-time alerts in the notification tray"
          checked={settings.notifyInApp}
          onChange={set('notifyInApp')}
        />
      </Section>

      <Section id="security" title="Security & access" subtitle="Applies to every admin account.">
        <ToggleRow
          title="Two-factor authentication"
          description="One-time passcode required for all admin logins"
          checked={settings.twoFactor}
          onChange={(value) => {
            saveSettings({ twoFactor: value });
          }}
        />
        <ToggleRow
          title="Session timeout"
          description="Automatic sign-out after inactivity"
          control={
            <Select
              value={settings.sessionHours}
              onChange={setValue('sessionHours')}
              options={['4', '8', '12', '24'].map((hours) => ({ value: hours, label: `${hours} hours` }))}
              aria-label="Session timeout"
              containerClassName="w-32"
            />
          }
        />
        <ToggleRow
          title="Data protection mode"
          description="How strictly guest personal data is anonymised in exports"
          control={
            <Select
              value={settings.gdprMode}
              onChange={setValue('gdprMode')}
              options={['Strict', 'Standard', 'Minimal']}
              aria-label="Data protection mode"
              containerClassName="w-32"
            />
          }
        />
      </Section>

      {!settings.twoFactor && (
        <Alert variant="error" title="Two-factor authentication is disabled">
          Every admin account can currently sign in with a password alone. Re-enable it unless you are mid-migration.
        </Alert>
      )}

      <Section id="payments" title="Deposit & payment automation" subtitle="Reduces manual reconciliation.">
        <ToggleRow
          title="Auto-release deposits"
          description="Release automatically if no damage is logged within 48 hours of check-out"
          checked={settings.autoReleaseDeposit}
          onChange={set('autoReleaseDeposit')}
        />
        <ToggleRow
          title="Stripe pre-authorisation"
          description="Hold rather than charge deposits for stays under 4 weeks (all markets except Nigeria)"
          checked={settings.stripePreAuth}
          onChange={set('stripePreAuth')}
        />
      </Section>

      <Section id="contracts" title="Contract & KYC automation" subtitle="Chasing, without anyone having to chase.">
        <ToggleRow
          title="Contract reminder interval"
          description="Remind the guest when a contract is still unsigned"
          control={
            <Select
              value={settings.contractReminderHours}
              onChange={setValue('contractReminderHours')}
              options={['24', '48', '72'].map((hours) => ({ value: hours, label: `${hours} hours` }))}
              aria-label="Contract reminder interval"
              containerClassName="w-32"
            />
          }
        />
        <ToggleRow
          title="KYC reminder interval"
          description="Remind the guest when identity verification is incomplete"
          control={
            <Select
              value={settings.kycReminderHours}
              onChange={setValue('kycReminderHours')}
              options={['12', '24', '48'].map((hours) => ({ value: hours, label: `${hours} hours` }))}
              aria-label="KYC reminder interval"
              containerClassName="w-32"
            />
          }
        />
        <ToggleRow
          title="Auto-cancel on KYC failure"
          description="Cancel the booking if verification fails and is unresolved after 72 hours"
          checked={settings.autoCancelOnKycFailure}
          onChange={set('autoCancelOnKycFailure')}
        />
      </Section>

      <Section id="integrations" title="Integrations" subtitle="Third-party services this portal depends on.">
        {data.integrations.map((integration) => (
          <ToggleRow
            key={integration.id}
            title={integration.name}
            description={integration.description}
            control={
              <Badge variant={integration.status === 'Connected' ? 'ok' : 'warn'} dot>
                {integration.status}
              </Badge>
            }
          />
        ))}
      </Section>

      {user?.role === 'L1' && <AnnouncementsSection />}
    </div>
  );
};
