import { useQuery } from '@tanstack/react-query';
import { countryService } from '@/lib/countryService';
import { queryKeys } from '@/lib/queryKeys';

/** Reference data, not session state — an hour of staleness is fine and avoids re-fetching on every field focus. */
const REFERENCE_STALE_TIME = 1000 * 60 * 60;

export const useCountries = () =>
  useQuery({
    queryKey: queryKeys.geo.countries(),
    queryFn: countryService.getCountries,
    staleTime: REFERENCE_STALE_TIME,
  });

export const useCountryStates = (countryCode) =>
  useQuery({
    queryKey: queryKeys.geo.states(countryCode),
    queryFn: () => countryService.getCountryStates(countryCode),
    enabled: Boolean(countryCode),
    staleTime: REFERENCE_STALE_TIME,
  });
