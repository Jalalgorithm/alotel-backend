import { useMemo } from 'react';
import { useProperties } from '@/features/properties/hooks/useProperties';
import { useSpaces } from '@/features/spaces/hooks/useSpaces';
import { useMaintenanceWorkers } from './useMaintenanceWorkers';

/**
 * `MaintenanceTicketSerializer` only ever returns raw `property`/`space`/
 * `assigned_worker` ids — never expanded names — so `ticket.propertyName`/
 * `spaceName`/`assignedWorkerName` are blank against the real API. Resolved
 * here from the same property/space/worker lists `TicketFormModal.jsx`
 * already fetches for its own dropdowns, rather than adding new requests.
 */
export const useMaintenanceNames = () => {
  const { data: propertiesData } = useProperties({ pageSize: 100, status: 'published' });
  const { data: spacesData } = useSpaces({ pageSize: 100 });
  const { data: workersData } = useMaintenanceWorkers({ pageSize: 100 });

  const propertyNames = useMemo(
    () => Object.fromEntries((propertiesData?.items ?? []).map((property) => [property.id, property.name])),
    [propertiesData],
  );
  const spaceNames = useMemo(
    () => Object.fromEntries((spacesData?.items ?? []).map((space) => [space.id, space.title])),
    [spacesData],
  );
  const workerNames = useMemo(
    () => Object.fromEntries((workersData?.items ?? []).map((worker) => [worker.id, worker.name])),
    [workersData],
  );

  return {
    propertyName: (id) => propertyNames[id] ?? '',
    spaceName: (id) => spaceNames[id] ?? '',
    workerName: (id) => workerNames[id] ?? '',
  };
};
