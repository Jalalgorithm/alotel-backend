/** Public API of the bookings feature. */
export { BookingsPage } from './components/BookingsPage';
export { BookingInvoicePage } from './components/BookingInvoicePage';
export { GuestsPage } from './components/GuestsPage';
export { CheckInOutPage } from './components/CheckInOutPage';
export { CheckoutReportsPage } from './components/CheckoutReportsPage';
export { ContractsPage } from './components/ContractsPage';
export { ContractTemplatesPage } from './components/ContractTemplatesPage';
export { ContractTemplateEditorPage } from './components/ContractTemplateEditorPage';
export { HousekeepingPage } from './components/HousekeepingPage';
export { CalendarPage } from './components/CalendarPage';
export { CancellationsPage } from './components/CancellationsPage';

export {
  useBookings,
  useBooking,
  useBookingInvoice,
  useBookingActions,
  useGuests,
  useCalendar,
  useCancellations,
  useCancellationReasons,
  useBookingRefundStatus,
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
