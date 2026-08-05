import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { DataTable } from '@/components/ui/DataTable';
import { AvatarCell } from '@/components/ui/Avatar';
import { useRoles, useStaff, useStaffMutations } from '../hooks/usePeople';
import { staffSchema } from '@/utils/validators';
import { formatRelative } from '@/utils/format';

/** Staff directory with invite and activation controls. */
export const StaffPage = () => {
  const { data: staff = [], isLoading } = useStaff();
  const { data: roles = [] } = useRoles();
  const { createStaff, isCreating, updateStaff, pendingId } = useStaffMutations();

  const [editing, setEditing] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(staffSchema),
    defaultValues: { name: '', email: '', phone: '', role: 'L2', regions: '' },
  });

  const openCreate = () => {
    reset({ name: '', email: '', phone: '', role: 'L2', regions: '' });
    setEditing({ mode: 'create' });
  };

  const openEdit = (member) => {
    reset({
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      regions: member.regions,
    });
    setEditing({ mode: 'edit', member });
  };

  const submit = (values) => {
    if (editing?.mode === 'edit') {
      updateStaff(editing.member.id, values, 'Staff member updated');
    } else {
      createStaff(values);
    }
    setEditing(null);
  };

  const roleOptions = roles.map((role) => ({ value: role.id, label: `${role.level} — ${role.name}` }));

  const columns = [
    {
      key: 'name',
      header: 'Staff member',
      render: (row) => (
        <AvatarCell
          name={row.name}
          initials={row.initials}
          color={row.color}
          primary={row.name}
          secondary={row.email}
          size="md"
        />
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => {
        const role = roles.find((entry) => entry.id === row.role);
        return (
          <Badge variant={row.role === 'L1' ? 'ok' : row.role === 'L2' ? 'info' : 'neutral'}>
            {role ? `${role.level} — ${role.name}` : row.role}
          </Badge>
        );
      },
    },
    { key: 'regions', header: 'Regions', render: (row) => <span className="text-ink-soft">{row.regions}</span> },
    { key: 'phone', header: 'Phone', render: (row) => <span className="whitespace-nowrap text-ink-soft">{row.phone}</span> },
    {
      key: 'lastActive',
      header: 'Last active',
      render: (row) => (
        <span className="whitespace-nowrap text-ink-muted">{row.lastActive ? formatRelative(row.lastActive) : 'Never'}</span>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1.5">
          <Button size="xs" onClick={() => openEdit(row)}>
            Edit
          </Button>
          <Button
            size="xs"
            variant={row.status === 'Active' ? 'dangerSoft' : 'primary'}
            isLoading={pendingId === row.id}
            onClick={() =>
              updateStaff(
                row.id,
                { status: row.status === 'Active' ? 'Inactive' : 'Active' },
                row.status === 'Active' ? 'Staff member deactivated' : 'Staff member reactivated',
              )
            }
          >
            {row.status === 'Active' ? 'Deactivate' : 'Reactivate'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Staff Management"
        subtitle="Create, edit and deactivate admin accounts. Level 1 only."
        actions={
          <Button variant="primary" leftIcon={<UserPlus className="size-3.5" aria-hidden="true" />} onClick={openCreate}>
            Add staff member
          </Button>
        }
      />

      <Card>
        <DataTable columns={columns} rows={staff} isLoading={isLoading} emptyTitle="No staff accounts yet" />
      </Card>

      <Modal
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.mode === 'edit' ? 'Edit staff member' : 'Add staff member'}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="primary" isLoading={isCreating} onClick={handleSubmit(submit)}>
              {editing?.mode === 'edit' ? 'Save changes' : 'Send invite'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit(submit)} className="space-y-3.5" noValidate>
          <Input label="Full name" placeholder="e.g. Amira Mohammed" error={errors.name?.message} {...register('name')} />
          <Input
            label="Work email"
            type="email"
            placeholder="e.g. a.mohammed@alotelspaces.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input label="Phone number" type="tel" placeholder="e.g. +971 50 234 5678" error={errors.phone?.message} {...register('phone')} />
          <Select label="Role level" options={roleOptions} error={errors.role?.message} {...register('role')} />
          <Input
            label="Assigned regions"
            placeholder="e.g. Lagos · Abuja"
            error={errors.regions?.message}
            {...register('regions')}
          />

          <Alert variant="info">
            {editing?.mode === 'edit'
              ? 'Changes take effect immediately and are recorded in the audit log.'
              : 'The invitee receives an email to set a password and enrol in two-factor authentication.'}
          </Alert>
        </form>
      </Modal>
    </div>
  );
};
