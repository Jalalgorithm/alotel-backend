import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Toggle } from '@/components/ui/Toggle';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { useAmenities, useToggleAmenity } from '../hooks/useCatalogue';

/**
 * Portfolio-wide amenity catalogue.
 *
 * Toggling here changes which amenities are offerable on new listings; it does
 * not retro-fit existing ones, which is what the notice explains.
 */
export const AmenitiesPage = () => {
  const { data, isLoading } = useAmenities();
  const { toggleAmenity, pendingName } = useToggleAmenity();

  const enabled = data?.enabled ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Amenities"
        subtitle="The master list offered when creating a listing."
        actions={
          <span className="rounded-full bg-brand-50 px-3 py-1.5 text-[11.5px] font-semibold text-brand-700">
            {enabled.length} enabled
          </span>
        }
      />

      <Alert variant="info" title="Changes apply to new listings">
        Disabling an amenity removes it from the picker in Add Property. Listings that already advertise it
        keep it until edited.
      </Alert>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-56 rounded-card" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data.groups.map((group) => (
            <Card key={group.id}>
              <CardHeader
                title={group.label}
                subtitle={`${group.items.filter((item) => enabled.includes(item)).length} of ${group.items.length} enabled`}
              />

              <ul className="divide-y divide-line border-t border-line">
                {group.items.map((item) => (
                  <li key={item} className="flex items-center justify-between gap-4 px-4 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">{item}</span>
                    <Toggle
                      checked={enabled.includes(item)}
                      onChange={() => toggleAmenity(item)}
                      disabled={pendingName === item}
                      label={item}
                    />
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
