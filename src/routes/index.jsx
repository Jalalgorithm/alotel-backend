import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Loading } from '@/components/ui/Spinner';
import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute';
import { NotFoundPage } from './NotFoundPage';
import { paths } from './paths';
import { CAPABILITIES as C } from '@/lib/mock/people';
// Eager: the auth module is in the entry chunk anyway (the shell and every
// guard use its hooks), so lazy-loading the login screen would split nothing.
import { ForgotPasswordPage, LoginPage, ResetPasswordPage, TwoFactorPage } from '@/features/auth';

/**
 * Route table.
 *
 * Screens are code-split per feature, and each protected route declares the
 * capability it requires — the same value the sidebar filters on, so navigation
 * and access can never drift apart.
 */
const load = (loader, name) => lazy(() => loader().then((module) => ({ default: module[name] })));

const DashboardPage = load(() => import('@/features/dashboard'), 'DashboardPage');
const AnalyticsPage = load(() => import('@/features/analytics'), 'AnalyticsPage');
const NotificationsPage = load(() => import('@/features/notifications'), 'NotificationsPage');

const PropertiesPage = load(() => import('@/features/properties'), 'PropertiesPage');
const PropertyWizardPage = load(() => import('@/features/properties'), 'PropertyWizardPage');
const PropertyDetailPage = load(() => import('@/features/properties'), 'PropertyDetailPage');
const UnitsPage = load(() => import('@/features/properties'), 'UnitsPage');
const AmenitiesPage = load(() => import('@/features/properties'), 'AmenitiesPage');
const PricingPage = load(() => import('@/features/properties'), 'PricingPage');
const PropertyReviewPage = load(() => import('@/features/properties'), 'PropertyReviewPage');

const MaintenanceDashboardPage = load(() => import('@/features/maintenance'), 'MaintenanceDashboardPage');
const WorkerDirectoryPage = load(() => import('@/features/maintenance'), 'WorkerDirectoryPage');
const WorkerDetailPage = load(() => import('@/features/maintenance'), 'WorkerDetailPage');
const TicketTablePage = load(() => import('@/features/maintenance'), 'TicketTablePage');
const TicketDetailPage = load(() => import('@/features/maintenance'), 'TicketDetailPage');

const SpacesPage = load(() => import('@/features/spaces'), 'SpacesPage');
const SpaceWizardPage = load(() => import('@/features/spaces'), 'SpaceWizardPage');
const SpaceBookingsPage = load(() => import('@/features/spaces'), 'SpaceBookingsPage');
const SpaceBookingCalendarPage = load(() => import('@/features/spaces'), 'SpaceBookingCalendarPage');
const SpaceApprovalQueuePage = load(() => import('@/features/spaces'), 'SpaceApprovalQueuePage');
const SpaceDetailPage = load(() => import('@/features/spaces'), 'SpaceDetailPage');

const BookingsPage = load(() => import('@/features/bookings'), 'BookingsPage');
const GuestsPage = load(() => import('@/features/bookings'), 'GuestsPage');
const CheckInOutPage = load(() => import('@/features/bookings'), 'CheckInOutPage');
const CheckoutReportsPage = load(() => import('@/features/bookings'), 'CheckoutReportsPage');
const ContractsPage = load(() => import('@/features/bookings'), 'ContractsPage');
const ContractTemplatesPage = load(() => import('@/features/bookings'), 'ContractTemplatesPage');
const HousekeepingPage = load(() => import('@/features/bookings'), 'HousekeepingPage');
const CalendarPage = load(() => import('@/features/bookings'), 'CalendarPage');
const CancellationsPage = load(() => import('@/features/bookings'), 'CancellationsPage');

const PaymentsPage = load(() => import('@/features/finance'), 'PaymentsPage');
const PayoutsPage = load(() => import('@/features/finance'), 'PayoutsPage');
const RevenuePage = load(() => import('@/features/finance'), 'RevenuePage');
const TaxPage = load(() => import('@/features/finance'), 'TaxPage');

const StaffPage = load(() => import('@/features/people'), 'StaffPage');
const RolesPage = load(() => import('@/features/people'), 'RolesPage');
const AuditLogPage = load(() => import('@/features/people'), 'AuditLogPage');

const SettingsPage = load(() => import('@/features/system'), 'SettingsPage');
const HelpPage = load(() => import('@/features/system'), 'HelpPage');

/** Every protected screen, as data — keeps the JSX below flat and scannable. */
const SCREENS = [
  { path: paths.dashboard, element: <DashboardPage />, capability: C.dashboardView, index: true },
  { path: paths.analytics, element: <AnalyticsPage />, capability: C.analyticsView },

  { path: paths.properties, element: <PropertiesPage />, capability: C.propertiesView },
  { path: paths.propertyNew, element: <PropertyWizardPage />, capability: C.propertiesManage },
  // Declared after `/properties/new` so the literal segment always wins the match.
  { path: paths.propertyDetail(), element: <PropertyDetailPage />, capability: C.propertiesView },
  { path: paths.units, element: <UnitsPage />, capability: C.unitsView },
  { path: paths.amenities, element: <AmenitiesPage />, capability: C.amenitiesManage },
  { path: paths.pricing, element: <PricingPage />, capability: C.pricingManage },
  { path: paths.propertyReview, element: <PropertyReviewPage />, capability: C.reviewsModerate },

  { path: paths.maintenanceDashboard, element: <MaintenanceDashboardPage />, capability: C.maintenanceView },
  { path: paths.maintenanceWorkers, element: <WorkerDirectoryPage />, capability: C.maintenanceView },
  { path: paths.maintenanceWorkerDetail(), element: <WorkerDetailPage />, capability: C.maintenanceView },
  { path: paths.maintenanceTickets, element: <TicketTablePage />, capability: C.maintenanceView },
  { path: paths.maintenanceTicketDetail(), element: <TicketDetailPage />, capability: C.maintenanceView },

  { path: paths.spaces, element: <SpacesPage />, capability: C.spacesView },
  { path: paths.spaceNew, element: <SpaceWizardPage />, capability: C.spacesManage },
  { path: paths.spaceBookings, element: <SpaceBookingsPage />, capability: C.spacesBookingsView },
  { path: paths.spaceCalendar, element: <SpaceBookingCalendarPage />, capability: C.spacesBookingsView },
  { path: paths.spaceApprovals, element: <SpaceApprovalQueuePage />, capability: C.spacesBookingsManage },
  // Declared after the static `/spaces/*` paths above so the literal segments always win the match.
  { path: paths.spaceDetail(), element: <SpaceDetailPage />, capability: C.spacesView },

  { path: paths.bookings, element: <BookingsPage />, capability: C.bookingsView },
  { path: paths.guests, element: <GuestsPage />, capability: C.guestsView },
  { path: paths.checkInOut, element: <CheckInOutPage />, capability: C.checkinManage },
  { path: paths.checkoutReports, element: <CheckoutReportsPage />, capability: C.checkoutReview },
  { path: paths.contracts, element: <ContractsPage />, capability: C.contractsManage },
  { path: paths.contractTemplates, element: <ContractTemplatesPage />, capability: C.contractsManage },
  { path: paths.housekeeping, element: <HousekeepingPage />, capability: C.housekeepingView },
  { path: paths.calendar, element: <CalendarPage />, capability: C.calendarView },
  { path: paths.cancellations, element: <CancellationsPage />, capability: C.cancellationsManage },

  { path: paths.payments, element: <PaymentsPage />, capability: C.financeView },
  { path: paths.payouts, element: <PayoutsPage />, capability: C.financeView },
  { path: paths.revenue, element: <RevenuePage />, capability: C.financeView },
  { path: paths.tax, element: <TaxPage />, capability: C.taxManage },

  { path: paths.staff, element: <StaffPage />, capability: C.staffManage },
  { path: paths.roles, element: <RolesPage />, capability: C.rolesView },
  { path: paths.auditLog, element: <AuditLogPage />, capability: C.auditView },

  { path: paths.notifications, element: <NotificationsPage />, capability: C.notificationsView },
  { path: paths.settings, element: <SettingsPage />, capability: C.settingsManage },
  { path: paths.help, element: <HelpPage />, capability: C.helpView },
];

export const AppRoutes = () => (
  <Suspense fallback={<Loading fullScreen />}>
    <Routes>
      {/* Auth screens — full-bleed, outside the portal shell */}
      <Route element={<PublicOnlyRoute />}>
        <Route path={paths.login} element={<LoginPage />} />
        <Route path={paths.twoFactor} element={<TwoFactorPage />} />
        <Route path={paths.forgotPassword} element={<ForgotPasswordPage />} />
        {/* Path shape is dictated by the reset link the API emails */}
        <Route path={paths.resetPassword()} element={<ResetPasswordPage />} />
      </Route>

      {/* Authenticated portal */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          {SCREENS.map(({ path, element, capability, index }) => (
            <Route
              key={path}
              index={index}
              path={index ? undefined : path}
              element={<ProtectedRoute capability={capability}>{element}</ProtectedRoute>}
            />
          ))}

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  </Suspense>
);
