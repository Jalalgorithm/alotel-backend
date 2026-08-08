import { useMemo, useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { AvatarCell } from '@/components/ui/Avatar';
import {
  useContractForBooking,
  useContracts,
  useContractStatus,
  useContractTemplates,
  useSendContract,
} from '../hooks/useBookings';
import { formatDate } from '@/utils/format';
import { CONTRACT_MATRIX } from '@/lib/mock/operations';
import { CONTRACT_REQUIRED_MIN_NIGHTS, CONTRACT_STATUS_LABEL } from '@/lib/contractSchema';

/** Contract lifecycle and the jurisdiction matrix that determines the template. */
export const ContractsPage = () => {
  const { data, isLoading } = useContracts();
  const { data: templates = [] } = useContractTemplates();
  const { sendContract, isPending, pendingId } = useSendContract();

  /**
   * The admin list endpoint carries no contract field, so every row starts
   * as "Not sent" (see `listContracts` in bookingService.js). Right after a
   * successful send, this reflects that one row's real result immediately —
   * it's deliberately session-local, not a fix for the missing bulk status.
   */
  const [sentOverrides, setSentOverrides] = useState({});
  const rows = useMemo(
    () => (data?.items ?? []).map((row) => (sentOverrides[row.id] ? { ...row, ...sentOverrides[row.id] } : row)),
    [data, sentOverrides],
  );

  const [activeRow, setActiveRow] = useState(null);

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
    {
      key: 'contract',
      header: (
        <span title="Reflects actions taken this session, not a live poll — open a booking's contract to see its confirmed status.">
          Status
        </span>
      ),
      render: (row) => <StatusBadge status={row.contract} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => {
        const eligible = row.nights >= CONTRACT_REQUIRED_MIN_NIGHTS;

        return (
          <div className="flex justify-end gap-1.5">
            <Button size="xs" onClick={() => setActiveRow(row)}>
              Contract
            </Button>
            {!eligible ? (
              <Badge variant="neutral" title="Stays under ~6 months use the booking-agreement checkbox instead of a signed contract.">
                Uses booking agreement
              </Badge>
            ) : row.contract !== 'Signed' ? (
              <Button
                size="xs"
                variant={row.contract === 'Declined' || row.contract === 'Expired' ? 'dangerSoft' : 'primary'}
                isLoading={isPending && pendingId === row.id}
                onClick={() =>
                  sendContract(
                    { bookingId: row.id },
                    {
                      onSuccess: (result) =>
                        setSentOverrides((current) => ({
                          ...current,
                          [row.id]: {
                            contract: CONTRACT_STATUS_LABEL[result.status] ?? 'Sent',
                            sentAt: result.sent_at,
                          },
                        })),
                    },
                  )
                }
              >
                {row.contract === 'Not sent' ? 'Send' : 'Re-send'}
              </Button>
            ) : null}
          </div>
        );
      },
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
          {/*
            Sending resolves a template from the booking's region and stay
            length. With none configured the API has nothing to send, so say so
            here rather than letting an admin click Send and get a 400.
          */}
          {templates.length === 0 && (
            <Alert variant="warn" title="No contract templates configured" className="mb-4">
              Contracts cannot be issued until at least one template exists. Add them under contract templates — the
              API resolves which one applies from the property region and stay length.
            </Alert>
          )}

          <DataTable columns={columns} rows={rows} isLoading={isLoading} emptyTitle="No bookings to contract yet" />
        </div>
      </Card>

      <ContractModal
        row={activeRow}
        onClose={() => setActiveRow(null)}
        onSent={(result) =>
          setSentOverrides((current) => ({
            ...current,
            [activeRow.id]: { contract: CONTRACT_STATUS_LABEL[result.status] ?? 'Sent', sentAt: result.sent_at },
          }))
        }
        isSending={isPending}
        sendContract={sendContract}
      />
    </div>
  );
};

/**
 * The actual contract for one booking, fetched on open rather than for every
 * row on load — the API only exposes this per-booking, not in bulk.
 */
const ContractModal = ({ row, onClose, onSent, isSending, sendContract }) => {
  const isOpen = Boolean(row);
  const { data: contract, isLoading } = useContractForBooking(row?.id);
  const { data: status } = useContractStatus(contract?.contractId, { enabled: contract?.status === 'signed' });
  const eligible = row ? row.nights >= CONTRACT_REQUIRED_MIN_NIGHTS : false;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={row ? `Contract — ${row.guest}` : ''}
      description={row ? `#${row.id} · ${row.contractType}` : ''}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Close</Button>
          {status?.signedDocumentUrl && (
            <Button
              variant="primary"
              as="a"
              href={status.signedDocumentUrl}
              target="_blank"
              rel="noreferrer"
              leftIcon={<Download className="size-3.5" aria-hidden="true" />}
            >
              View signed PDF
            </Button>
          )}
        </div>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-[12.5px] text-ink-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading contract…
        </div>
      ) : contract ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <StatusBadge status={CONTRACT_STATUS_LABEL[contract.status] ?? contract.status} />
            {contract.templateName && (
              <span className="text-[11px] text-ink-muted">
                {contract.templateName} · v{contract.templateVersion}
              </span>
            )}
          </div>
          <pre className="whitespace-pre-wrap rounded-lg bg-line-soft p-4 font-sans text-[11.5px] leading-6 text-ink-soft">
            {contract.content || 'This contract has no body on record.'}
          </pre>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <FileText className="size-6 text-ink-muted" aria-hidden="true" />
          <p className="text-[12.5px] text-ink-soft">No contract has been issued for this booking yet.</p>
          {eligible ? (
            <Button
              size="sm"
              variant="primary"
              isLoading={isSending}
              onClick={() => sendContract({ bookingId: row.id }, { onSuccess: onSent })}
            >
              Send now
            </Button>
          ) : (
            <p className="text-[11px] text-ink-muted">
              This stay is under {CONTRACT_REQUIRED_MIN_NIGHTS} nights — it uses the booking-agreement checkbox instead.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
};
