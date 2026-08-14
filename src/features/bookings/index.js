/** Public API of the bookings feature. */
export { BookingsPage } from './components/BookingsPage';
export { GuestsPage } from './components/GuestsPage';
export { CheckInOutPage } from './components/CheckInOutPage';
export { CheckoutReportsPage } from './components/CheckoutReportsPage';
export { ContractsPage } from './components/ContractsPage';
export { ContractTemplatesPage } from './components/ContractTemplatesPage';
export { HousekeepingPage } from './components/HousekeepingPage';
export { CalendarPage } from './components/CalendarPage';
export { CancellationsPage } from './components/CancellationsPage';

export {
  useBookings,
  useBooking,
  useBookingActions,
  useGuests,
  useContracts,
  useCalendar,
  useCancellations,
  useProcessRefund,
  useInspectionState,
  useDamageAssessments,
  useCreateDamageAssessment,
  useUpdateDamageAssessment,
  useCheckoutReport,
  useCheckoutReportsByBookingIds,
  useGenerateCheckoutReport,
} from './hooks/useBookings';
export {
  useTodaysRooms,
  useTasks,
  useUpdateTaskStatus,
  useAssignedProperties,
  useReportIssue,
} from './hooks/useOperations';

export { bookingService } from './services/bookingService';
