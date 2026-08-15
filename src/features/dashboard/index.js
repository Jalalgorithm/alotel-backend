/** Public API of the dashboard feature. */
export { DashboardPage } from './components/DashboardPage';
export { StatCard } from './components/StatCard';
export { useDashboardOverview, useNavBadges, useRevenueOverview } from './hooks/useDashboard';
export { useVerificationDecision, useVerifications } from './hooks/useVerificationDecision';
export { dashboardService } from './services/dashboardService';
export { verificationService } from './services/verificationService';
