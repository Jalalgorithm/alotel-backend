import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bath,
  BedDouble,
  Building2,
  Eye,
  LayoutGrid,
  List,
  MapPin,
  Pause,
  Plus,
  Star,
  Upload,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ListToolbar } from '@/components/shared/ListToolbar';
import { Pagination } from '@/components/shared/Pagination';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/utils/classNames';
import { formatCurrency, formatDate } from '@/utils/format';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useProperties, usePropertyStatus } from '../hooks/useProperties';
import { CLASSIFICATIONS, LOCATIONS, PROPERTY_TYPES, PROPERTY_STATUSES, STATUS_LABELS } from '@/lib/propertySchema';
import { useAuth } from '@/features/auth';
import { CAPABILITIES } from '@/lib/mock/people';
import { paths } from '@/routes/paths';

const STATUS_VARIANT = {
  published: 'ok',
  draft: 'neutral',
  archived: 'warn',
  under_review: 'info',
};

const CLASSIFICATION_VARIANT = {
  Alotel: 'ok',
  'Third-Party': 'info',
  'Third-Party — Social Housing': 'warn',
};

/** Compact spec line reused by both the card and the table. */
const Specs = ({ property, className }) => (
  <span className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted', className)}>
    <span className="inline-flex items-center gap-1">
      <BedDouble className="size-3" aria-hidden="true" />
      {property.bedrooms || 'Studio'}
      {property.bedrooms ? ' bed' : ''}
    </span>
    <span className="inline-flex items-center gap-1">
      <Bath className="size-3" aria-hidden="true" />
      {property.bathrooms} bath
    </span>
    <span className="inline-flex items-center gap-1">
      <Users className="size-3" aria-hidden="true" />
      {property.maxGuests}
    </span>
    {property.area ? <span>{property.area} m²</span> : null}
  </span>
);

const RateCell = ({ property }) => (
  <span className="whitespace-nowrap">
    <span className="font-semibold tabular-nums text-ink">
      {formatCurrency(property.baseRate, property.currency, { compact: property.baseRate > 99999 })}
    </span>
    <span className="ml-1 text-[10.5px] text-ink-muted">/night</span>
  </span>
);

/** Gallery card — the richer view, and the default. */
const PropertyCard = ({ property, canManage, onPublish, pendingId }) => (
  <Card className="group flex flex-col overflow-hidden transition-shadow hover:shadow-raised">
    <div className="relative flex h-28 shrink-0 items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
      {property.thumbnail ? (
        <img src={property.thumbnail} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <Building2 className="size-7 text-brand-600/40" aria-hidden="true" />
      )}

      <div className="absolute left-2.5 top-2.5 flex gap-1.5">
        <Badge variant={STATUS_VARIANT[property.status] ?? 'neutral'} dot>
          {property.statusLabel}
        </Badge>
      </div>

      {property.rating ? (
        <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10.5px] font-semibold text-ink shadow-sm">
          <Star className="size-2.5 fill-gold text-gold" aria-hidden="true" />
          {property.rating.toFixed(1)}
        </span>
      ) : null}
    </div>

    <div className="flex flex-1 flex-col p-4">
      <h3 className="truncate font-display text-[13.5px] font-semibold text-ink">
        <Link to={paths.propertyDetail(property.id)} className="transition-colors hover:text-brand-700">
          {property.name}
        </Link>
      </h3>

      <p className="mt-0.5 inline-flex items-center gap-1 truncate text-[11px] text-ink-muted">
        <MapPin className="size-3 shrink-0 text-brand-600" aria-hidden="true" />
        {property.city}, {property.country}
      </p>

      <div className="mt-2.5">
        <Specs property={property} />
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <Badge variant={CLASSIFICATION_VARIANT[property.classification] ?? 'neutral'}>
          {property.classification}
        </Badge>
        <Badge variant="neutral">{property.type}</Badge>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-3.5">
        <RateCell property={property} />

        <div className="flex shrink-0 gap-1.5">
          <Button size="xs" to={paths.propertyDetail(property.id)}>
            View
          </Button>
          {canManage && property.status !== 'published' && (
            <Button
              size="xs"
              variant="primary"
              isLoading={pendingId === property.id}
              onClick={() => onPublish(property)}
            >
              Publish
            </Button>
          )}
        </div>
      </div>
    </div>
  </Card>
);

/** Portfolio list — server-filtered, server-paginated. */
export const PropertiesPage = () => {
  const { can } = useAuth();
  const canManage = can(CAPABILITIES.propertiesManage);

  const [layout, setLayout] = useState('grid');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [location, setLocation] = useState('All');
  const [type, setType] = useState('All');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search);
  const { data, isFetching, isError, error } = useProperties({
    query: debouncedSearch,
    status,
    location,
    type,
    sort,
    page,
  });
  const { setStatus: setPropertyStatus, pendingId } = usePropertyStatus();

  // Any filter change restarts pagination — page 3 of a new filter is nonsense.
  const withReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const publish = (property) => setPropertyStatus({ id: property.id, status: 'published' });

  const items = data?.items ?? [];
  const isInitialLoad = isFetching && !data;

  const columns = [
    {
      key: 'name',
      header: 'Property',
      render: (row) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
            <Building2 className="size-4 text-brand-600" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <Link
              to={paths.propertyDetail(row.id)}
              className="block truncate text-[12.5px] font-semibold text-ink transition-colors hover:text-brand-700"
            >
              {row.name}
            </Link>
            <p className="truncate text-[10.5px] text-ink-muted">
              {row.city}, {row.country}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => <span className="whitespace-nowrap text-ink-soft">{row.type}</span>,
    },
    {
      key: 'classification',
      header: 'Class',
      render: (row) => (
        <Badge variant={CLASSIFICATION_VARIANT[row.classification] ?? 'neutral'}>{row.classification}</Badge>
      ),
    },
    { key: 'specs', header: 'Configuration', render: (row) => <Specs property={row} /> },
    { key: 'baseRate', header: 'Rate', align: 'right', render: (row) => <RateCell property={row} /> },
    {
      key: 'rating',
      header: 'Rating',
      align: 'right',
      render: (row) =>
        row.rating ? (
          <span className="inline-flex items-center gap-1 whitespace-nowrap text-[11.5px]">
            <Star className="size-3 fill-gold text-gold" aria-hidden="true" />
            <span className="font-semibold tabular-nums">{row.rating.toFixed(1)}</span>
            <span className="text-ink-muted">({row.reviewCount})</span>
          </span>
        ) : (
          <span className="text-[11px] text-ink-muted">No reviews</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={STATUS_VARIANT[row.status] ?? 'neutral'} dot>
          {row.statusLabel}
        </Badge>
      ),
    },
    {
      key: 'publishedAt',
      header: 'Published',
      render: (row) => (
        <span className="whitespace-nowrap text-[11px] text-ink-muted">
          {row.publishedAt ? formatDate(row.publishedAt, 'd MMM yyyy') : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1.5">
          <Button size="xs" to={paths.propertyDetail(row.id)} leftIcon={<Eye className="size-3" aria-hidden="true" />}>
            View
          </Button>
          {canManage &&
            (row.status === 'published' ? (
              <Button
                size="xs"
                isLoading={pendingId === row.id}
                leftIcon={<Pause className="size-3" aria-hidden="true" />}
                onClick={() => setPropertyStatus({ id: row.id, status: 'archived' })}
              >
                Archive
              </Button>
            ) : (
              <Button
                size="xs"
                variant="primary"
                isLoading={pendingId === row.id}
                leftIcon={<Upload className="size-3" aria-hidden="true" />}
                onClick={() => publish(row)}
              >
                Publish
              </Button>
            ))}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Properties"
        subtitle="Every listing across the portfolio, with live status and pricing."
        actions={
          canManage && (
            <Button variant="primary" to={paths.propertyNew} leftIcon={<Plus className="size-3.5" aria-hidden="true" />}>
              Add Property
            </Button>
          )
        }
      />

      <Card>
        <div className="p-4">
          <ListToolbar
            search={search}
            onSearchChange={withReset(setSearch)}
            searchPlaceholder="Search by name, city or address…"
            total={data?.total}
            noun="property"
            nounPlural="properties"
            filters={[
              {
                id: 'status',
                value: status,
                onChange: withReset(setStatus),
                label: 'Status',
                options: [
                  { value: 'All', label: 'All statuses' },
                  ...PROPERTY_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })),
                ],
              },
              {
                id: 'location',
                value: location,
                onChange: withReset(setLocation),
                label: 'Market',
                options: [{ value: 'All', label: 'All markets' }, ...LOCATIONS],
              },
              {
                id: 'type',
                value: type,
                onChange: withReset(setType),
                label: 'Type',
                options: [{ value: 'All', label: 'All types' }, ...PROPERTY_TYPES],
              },
              {
                id: 'sort',
                value: sort,
                onChange: withReset(setSort),
                label: 'Sort',
                options: [
                  { value: 'newest', label: 'Newest first' },
                  { value: 'price_asc', label: 'Price: low to high' },
                  { value: 'price_desc', label: 'Price: high to low' },
                ],
              },
            ]}
            actions={
              <div className="flex items-center gap-1">
                {[
                  { id: 'grid', Icon: LayoutGrid, label: 'Card view' },
                  { id: 'list', Icon: List, label: 'Table view' },
                ].map(({ id, Icon, label }) => (
                  <button
                    key={id}
                    type="button"
                    aria-label={label}
                    aria-pressed={layout === id}
                    onClick={() => setLayout(id)}
                    className={cn(
                      'flex size-8 items-center justify-center rounded-md transition-colors',
                      layout === id ? 'bg-brand-600 text-white' : 'text-ink-muted hover:bg-black/5',
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden="true" />
                  </button>
                ))}
              </div>
            }
          />
        </div>

        {isError ? (
          <div className="border-t border-line">
            <EmptyState
              title="Couldn't load properties"
              description={error?.message ?? 'The API did not respond. Check the server is running.'}
            />
          </div>
        ) : layout === 'list' ? (
          <div className="border-t border-line">
            <DataTable
              columns={columns}
              rows={items}
              isLoading={isInitialLoad}
              emptyTitle="No properties match these filters"
              emptyDescription="Try clearing a filter, or add a new listing."
            />
          </div>
        ) : (
          <div className="border-t border-line p-4">
            {isInitialLoad ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {Array.from({ length: 8 }, (_, index) => (
                  <CardSkeleton key={index} className="h-64" />
                ))}
              </div>
            ) : items.length ? (
              <div
                className={cn(
                  'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4',
                  // Dim while a filtered refetch is in flight, rather than
                  // blanking the grid the admin is already reading.
                  isFetching && 'opacity-60 transition-opacity',
                )}
              >
                {items.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    canManage={canManage}
                    onPublish={publish}
                    pendingId={pendingId}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No properties match these filters"
                description="Try clearing a filter, or add a new listing."
                action={
                  canManage && (
                    <Button variant="primary" to={paths.propertyNew}>
                      Add Property
                    </Button>
                  )
                }
              />
            )}
          </div>
        )}
      </Card>

      <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} onChange={setPage} />
    </div>
  );
};
