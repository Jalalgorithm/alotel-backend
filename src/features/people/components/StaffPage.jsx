import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, RefreshCw, UserPlus } from 'lucide-react';
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
import { PropertyMultiSelect } from './PropertyMultiSelect';
import { createStaffSchema, editStaffSchema } from '@/utils/validators';
import { toast } from '@/stores/uiStore';

/** Short, backend-valid (8+ chars, mixed case + digits) temporary password. */
const generatePassword = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  const random = btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, '');
  return `${random.slice(0, 10)}!9`;
};

const emptyValues = {
  firstName: '',
  lastName: '',
  otherName: '',
  email: '',
  password: '',
  role: 'L2',
  assignedProperties: [],
};

/** Staff directory: create, edit and activate/deactivate Facility Manager / Housekeeper accounts. */
export const StaffPage = () => {
  const { data: staff = [], isLoading } = useStaff();
  const { data: roles = [] } = useRoles();
  const { createStaffAsync, isCreating, updateStaff, pendingId } = useStaffMutations();

  const [editing, setEditing] = useState(null); // { mode: 'create' | 'edit', member? }
  const [credentials, setCredentials] = useState(null); // { email, password } — shown once after create

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(editing?.mode === 'edit' ? editStaffSchema : createStaffSchema),
    defaultValues: emptyValues,
  });

  const closeModal = () => {
    setEditing(null);
    setCredentials(null);
  };

  const openCreate = () => {
    reset(emptyValues);
    setCredentials(null);
    setEditing({ mode: 'create' });
  };

  const openEdit = (member) => {
    reset({
      ...emptyValues,
      firstName: member.firstName,
      lastName: member.lastName,
      otherName: member.otherName,
      assignedProperties: member.assignedProperties,
    });
    setEditing({ mode: 'edit', member });
  };

  const submit = async (values) => {
    if (editing?.mode === 'edit') {
      updateStaff(editing.member.id, values, 'Staff member updated');
      closeModal();
      return;
    }

    try {
      await createStaffAsync(values);
      setCredentials({ email: values.email, password: values.password });
    } catch {
      // The mutation's onError already surfaced a toast.
    }
  };

  const copyCredentials = () => {
    if (!credentials) return;
    navigator.clipboard.writeText(`Email: ${credentials.email}\nPassword: ${credentials.password}`);
    toast.success('Copied to clipboard');
  };

  const roleOptions = roles
    .filter((role) => role.id !== 'L1')
    .map((role) => ({ value: role.id, label: `${role.level} — ${role.name}` }));

  const roleLabel = (levelId) => roles.find((entry) => entry.id === levelId);

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
        const role = roleLabel(row.role);
        return (
          <Badge variant={row.role === 'L2' ? 'info' : 'neutral'}>{role ? `${role.level} — ${role.name}` : row.role}</Badge>
        );
      },
    },
    {
      key: 'assignedProperties',
      header: 'Assigned properties',
      render: (row) =>
        row.assignedProperties.length === 0 ? (
          <span className="text-ink-muted">Unassigned</span>
        ) : (
          <span className="text-ink-soft">
            {row.assignedProperties.length} {row.assignedProperties.length === 1 ? 'property' : 'properties'}
          </span>
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
        subtitle="Create, edit and deactivate Facility Manager and Housekeeper accounts. Level 1 only."
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
        onClose={closeModal}
        title={credentials ? 'Staff member created' : editing?.mode === 'edit' ? 'Edit staff member' : 'Add staff member'}
        footer={
          credentials ? (
            <div className="flex justify-end">
              <Button variant="primary" onClick={closeModal}>
                Done
              </Button>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button onClick={closeModal}>Cancel</Button>
              <Button variant="primary" isLoading={isCreating} onClick={handleSubmit(submit)}>
                {editing?.mode === 'edit' ? 'Save changes' : 'Create staff member'}
              </Button>
            </div>
          )
        }
      >
        {credentials ? (
          <div className="space-y-3.5">
            <Alert variant="success" title="Share these credentials securely">
              This password is shown once and cannot be retrieved again after you close this dialog.
            </Alert>
            <div className="space-y-2 rounded-lg border border-line bg-line-soft/60 p-3 text-[13px]">
              <p>
                <span className="font-semibold text-ink">Email:</span> {credentials.email}
              </p>
              <p className="font-mono">
                <span className="font-semibold text-ink">Password:</span> {credentials.password}
              </p>
            </div>
            <Button leftIcon={<Copy className="size-3.5" aria-hidden="true" />} onClick={copyCredentials}>
              Copy email &amp; password
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(submit)} className="space-y-3.5" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <Input label="First name" placeholder="e.g. Amira" error={errors.firstName?.message} {...register('firstName')} />
              <Input label="Last name" placeholder="e.g. Mohammed" error={errors.lastName?.message} {...register('lastName')} />
            </div>
            <Input
              label="Other name (optional)"
              placeholder="e.g. middle name"
              error={errors.otherName?.message}
              {...register('otherName')}
            />

            {editing?.mode === 'edit' ? (
              <div>
                <p className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">
                  Work email
                </p>
                <p className="text-[13px] text-ink-soft">{editing.member.email}</p>
              </div>
            ) : (
              <Input
                label="Work email"
                type="email"
                placeholder="e.g. a.mohammed@alotelspaces.com"
                error={errors.email?.message}
                {...register('email')}
              />
            )}

            {editing?.mode === 'edit' ? (
              <div>
                <p className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.07em] text-ink-muted">
                  Role level
                </p>
                {(() => {
                  const role = roleLabel(editing.member.role);
                  return (
                    <Badge variant={editing.member.role === 'L2' ? 'info' : 'neutral'}>
                      {role ? `${role.level} — ${role.name}` : editing.member.role}
                    </Badge>
                  );
                })()}
              </div>
            ) : (
              <Select label="Role level" options={roleOptions} error={errors.role?.message} {...register('role')} />
            )}

            {editing?.mode !== 'edit' && (
              <div className="flex items-end gap-2">
                <Input
                  label="Temporary password"
                  type="password"
                  placeholder="At least 8 characters"
                  error={errors.password?.message}
                  containerClassName="flex-1"
                  {...register('password')}
                />
                <Button
                  type="button"
                  className="mb-[1px]"
                  leftIcon={<RefreshCw className="size-3.5" aria-hidden="true" />}
                  onClick={() => setValue('password', generatePassword(), { shouldValidate: true })}
                >
                  Generate
                </Button>
              </div>
            )}

            <Controller
              name="assignedProperties"
              control={control}
              render={({ field }) => (
                <PropertyMultiSelect value={field.value} onChange={field.onChange} error={errors.assignedProperties?.message} />
              )}
            />

            <Alert variant="info">
              {editing?.mode === 'edit'
                ? 'Changes take effect immediately.'
                : 'The account is active immediately — share the temporary password with the new hire yourself.'}
            </Alert>
          </form>
        )}
      </Modal>
    </div>
  );
};
