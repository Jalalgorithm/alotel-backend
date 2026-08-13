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
} from './hooks/useBookings';
export {
  useCheckoutReports,
  useSaveCheckoutReport,
  useTodaysRooms,
  useTasks,
  useUpdateTaskStatus,
  useAssignedProperties,
  useReportIssue,
} from './hooks/useOperations';

export { bookingService } from './services/bookingService';
