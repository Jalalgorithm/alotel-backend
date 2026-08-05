import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { AvatarCell } from '@/components/ui/Avatar';
import { useBookingActions, useContracts } from '../hooks/useBookings';
import { formatDate } from '@/utils/format';
import { CONTRACT_MATRIX, CONTRACT_TEMPLATES } from '@/lib/mock/operations';
import { toast } from '@/stores/uiStore';

/** Contract lifecycle and the jurisdiction matrix that determines the template. */
export const ContractsPage = () => {
  const { data = [], isLoading } = useContracts();
  const actions = useBookingActions();
  const [template, setTemplate] = useState(null);

  const columns = [
    {
      key: 'id',
      header: 'Booking',
      render: (row) => <span className="font-mono text-[11.5px] font-bold text-brand-700">#{row.id}</span>,
    },
    {
      key: 'guest',
      header: 'Guest',
      render: (row) => (
        <AvatarCell name={row.guest} initials={row.initials} color={row.color} primary={row.guest} size="sm" />
      ),
    },
    { key: 'property', header: 'Property', render: (row) => <span className="text-ink-soft">{row.property}</span> },
    {
      key: 'contractType',
      header: 'Contract type',
      render: (row) => <Badge variant="info">{row.contractType}</Badge>,
    },
    {
      key: 'nights',
      header: 'Term',
      render: (row) => <span className="whitespace-nowrap text-ink-soft">{row.nights} nights</span>,
    },
    {
      key: 'sentAt',
      header: 'Sent',
      render: (row) => <span className="whitespace-nowrap text-ink-muted">{row.sentAt ? formatDate(row.sentAt) : '—'}</span>,
    },
    {
      key: 'signedAt',
      header: 'Signed',
      render: (row) => (
        <span className="whitespace-nowrap text-ink-muted">{row.signedAt ? formatDate(row.signedAt) : '—'}</span>
      ),
    },
    { key: 'contract', header: 'Status', render: (row) => <StatusBadge status={row.contract} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1.5">
          <Button size="xs" onClick={() => setTemplate(row.contractType)}>
            Template
          </Button>
          {row.contract === 'Signed' ? (
            <Button
              size="xs"
              variant="ghost"
              leftIcon={<Download className="size-3" aria-hidden="true" />}
              onClick={() => toast.success('Download started', `${row.contractType} · #${row.id}`)}
            >
              PDF
            </Button>
          ) : (
            <Button
              size="xs"
              variant={row.contract === 'Overdue' ? 'dangerSoft' : 'primary'}
              isLoading={actions.pendingId === row.id}
              onClick={() => actions.sendContract(row.id)}
            >
              {row.contract === 'Overdue' ? 'Re-send' : 'Send'}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contracts & E-Sign"
        subtitle="Managed via Dropbox Sign — eIDAS and ESIGN compliant, with full audit trails."
        actions={
          <div className="flex gap-2">
            <Badge variant="ok" dot>
              Dropbox Sign connected
            </Badge>
          </div>
        }
      />

      <Card>
        <CardHeader
          title="Contract type by duration and jurisdiction"
          subtitle="Determined automatically when a booking is created."
        />

        <div className="table-scroll border-t border-line">
          <table className="data-table">
            <thead>
              <tr>
                <th>Duration</th>
                <th>UK</th>
                <th>Spain</th>
                <th>USA</th>
                <th>UAE</th>
                <th>Nigeria</th>
              </tr>
            </thead>
            <tbody>
              {CONTRACT_MATRIX.map((row) => (
                <tr key={row.duration}>
                  <td className="whitespace-nowrap font-semibold">{row.duration}</td>
                  <td className="text-ink-soft">{row.UK}</td>
                  <td className="text-ink-soft">{row.Spain}</td>
                  <td className="text-ink-soft">{row.USA}</td>
                  <td className="text-ink-soft">{row.UAE}</td>
                  <td className="text-ink-soft">{row.Nigeria}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="All booking contracts" />
        <div className="border-t border-line">
          <DataTable columns={columns} rows={data} isLoading={isLoading} emptyTitle="No contracts yet" />
        </div>
      </Card>

      <Modal
        isOpen={Boolean(template)}
        onClose={() => setTemplate(null)}
        size="lg"
        title={`Template — ${template ?? ''}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setTemplate(null)}>Close</Button>
            <Button
              variant="primary"
              leftIcon={<Download className="size-3.5" aria-hidden="true" />}
              onClick={() => {
                toast.success('Template downloaded', template);
                setTemplate(null);
              }}
            >
              Download
            </Button>
          </div>
        }
      >
        {CONTRACT_TEMPLATES[template] ? (
          <pre className="whitespace-pre-wrap rounded-lg bg-line-soft p-4 font-sans text-[11.5px] leading-6 text-ink-soft">
            {CONTRACT_TEMPLATES[template]}
          </pre>
        ) : (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <FileText className="size-6 text-ink-muted" aria-hidden="true" />
            <p className="text-[12.5px] text-ink-soft">
              The full text for <strong>{template}</strong> is held by the legal team.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};
