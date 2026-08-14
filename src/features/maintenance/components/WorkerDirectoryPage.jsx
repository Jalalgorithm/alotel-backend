import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HardHat, Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { Pagination } from '@/components/shared/Pagination';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useMaintenanceWorkers } from '../hooks/useMaintenanceWorkers';
import { WORKER_EMPLOYMENT_TYPES, WORKER_STATUSES } from '@/lib/maintenanceSchema';
import { useAuth } from '@/features/auth';
import { CAPABILITIES } from '@/lib/mock/people';
import { paths } from '@/routes/paths';
import { WorkerFormModal } from './WorkerFormModal';

/** Worker/vendor directory — `GET /operations/maintenance/workers/`. */
export const WorkerDirectoryPage = () => {
  const { can } = useAuth();
  const canManage = can(CAPABILITIES.maintenanceManage);
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [employmentType, setEmploymentType] = useState('All');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search);
  const { data, isFetching } = useMaintenanceWorkers({
    query: debouncedSearch,
    employmentType: employmentType === 'All' ? undefined : employmentType,
    status: status === 'All' ? undefined : status,
    page,
  });

  const withReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const columns = [
    {
      key: 'name',
      header: 'Worker',
      render: (row) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
            <HardHat className="size-4 text-brand-600" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <Link to={paths.maintenanceWorkerDetail(row.id)} className="block truncate text-[12.5px] font-semibold text-ink transition-colors hover:text-brand-700">
              {row.name}
            </Link>
            <p className="truncate text-[10.5px] text-ink-muted">{row.companyName || row.phone}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'specialtyTags',
      header: 'Specialties',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.specialtyTags.map((tag) => <Badge key={tag} variant="neutral">{tag}</Badge>)}
        </div>
      ),
    },
    {
      key: 'employmentType',
      header: 'Type',
      render: (row) => <Badge variant={row.employmentType === 'in_house' ? 'info' : 'brand'}>{row.employmentType === 'in_house' ? 'In-house' : 'Vendor'}</Badge>,
    },
    { key: 'assignedPropertyCount', header: 'Properties', align: 'right' },
    { key: 'status', header: 'Status', render: (row) => <Badge variant={row.status === 'active' ? 'ok' : 'neutral'} dot>{row.status === 'active' ? 'Active' : 'Inactive'}</Badge> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Worker Directory"
        subtitle="In-house staff and external vendors available for maintenance tickets."
        actions={canManage && <Button variant="primary" leftIcon={<Plus className="size-3.5" aria-hidden="true" />} onClick={() => setIsModalOpen(true)}>Add worker</Button>}
      />

      <Card>
        <div className="p-4">
          <ListToolbar
            search={search}
            onSearchChange={withReset(setSearch)}
            searchPlaceholder="Search by name or company…"
            total={data?.total}
            noun="worker"
            filters={[
              { id: 'employmentType', value: employmentType, onChange: withReset(setEmploymentType), label: 'Type', options: [{ value: 'All', label: 'All types' }, ...WORKER_EMPLOYMENT_TYPES] },
              { id: 'status', value: status, onChange: withReset(setStatus), label: 'Status', options: [{ value: 'All', label: 'All statuses' }, ...WORKER_STATUSES] },
            ]}
          />
        </div>
        <div className="border-t border-line">
          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            isLoading={isFetching && !data}
            onRowClick={(row) => navigate(paths.maintenanceWorkerDetail(row.id))}
            emptyTitle="No workers match these filters"
            emptyDescription="Add in-house staff or external vendors to assign them to maintenance tickets."
          />
        </div>
      </Card>

      <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} onChange={setPage} />

      <WorkerFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
