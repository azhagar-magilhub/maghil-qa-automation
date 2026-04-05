import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import KeyboardShortcuts from '@/components/shared/KeyboardShortcuts'
import FeedbackWidget from '@/components/shared/FeedbackWidget'
import SessionTimeout from '@/components/shared/SessionTimeout'
import ErrorBoundary from '@/components/shared/ErrorBoundary'
import PageErrorBoundary from '@/components/shared/PageErrorBoundary'
import { ToastContainer } from '@/components/shared/Toast'
import { Loader2 } from 'lucide-react'

// Lazy-loaded pages for code splitting
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const ExcelUploadPage = lazy(() => import('@/pages/ExcelUploadPage'))
const TeamsPage = lazy(() => import('@/pages/TeamsPage'))
const ReportsPage = lazy(() => import('@/pages/ReportsPage'))
const AuditPage = lazy(() => import('@/pages/AuditPage'))
const SetupWizardPage = lazy(() => import('@/pages/SetupWizardPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const TestCasesPage = lazy(() => import('@/pages/TestCasesPage'))
const ApiTestRunnerPage = lazy(() => import('@/pages/ApiTestRunnerPage'))
const WebTestRunnerPage = lazy(() => import('@/pages/WebTestRunnerPage'))
const MobileTestRunnerPage = lazy(() => import('@/pages/MobileTestRunnerPage'))
const SecurityScannerPage = lazy(() => import('@/pages/SecurityScannerPage'))
const QADashboardPage = lazy(() => import('@/pages/QADashboardPage'))
const TestDataGeneratorPage = lazy(() => import('@/pages/TestDataGeneratorPage'))
const EnvironmentManagerPage = lazy(() => import('@/pages/EnvironmentManagerPage'))
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'))
const CICDPage = lazy(() => import('@/pages/CICDPage'))
const AccessibilityPage = lazy(() => import('@/pages/AccessibilityPage'))
const LogAnalyzerPage = lazy(() => import('@/pages/LogAnalyzerPage'))
const AIHubPage = lazy(() => import('@/pages/AIHubPage'))
const ContractTestingPage = lazy(() => import('@/pages/ContractTestingPage'))
const ChaosEngineeringPage = lazy(() => import('@/pages/ChaosEngineeringPage'))
const DatabaseTestingPage = lazy(() => import('@/pages/DatabaseTestingPage'))
const SnapshotTestingPage = lazy(() => import('@/pages/SnapshotTestingPage'))
const FlakeAnalyzerPage = lazy(() => import('@/pages/FlakeAnalyzerPage'))
const CompliancePage = lazy(() => import('@/pages/CompliancePage'))
const CoverageMapperPage = lazy(() => import('@/pages/CoverageMapperPage'))
const ReleaseGatePage = lazy(() => import('@/pages/ReleaseGatePage'))
const TestRecorderPage = lazy(() => import('@/pages/TestRecorderPage'))
const TestSchedulerPage = lazy(() => import('@/pages/TestSchedulerPage'))
const TeamManagementPage = lazy(() => import('@/pages/TeamManagementPage'))
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'))
const PDFReportPage = lazy(() => import('@/pages/PDFReportPage'))
const CustomDashboardPage = lazy(() => import('@/pages/CustomDashboardPage'))
const WebhooksPage = lazy(() => import('@/pages/WebhooksPage'))
const APIAnalyticsPage = lazy(() => import('@/pages/APIAnalyticsPage'))
const DataMaskingPage = lazy(() => import('@/pages/DataMaskingPage'))
const DocsPage = lazy(() => import('@/pages/DocsPage'))
const GlobalSearchPage = lazy(() => import('@/pages/GlobalSearchPage'))
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage'))
const ActivityFeedPage = lazy(() => import('@/pages/ActivityFeedPage'))
const ChangelogPage = lazy(() => import('@/pages/ChangelogPage'))
const PreferencesPage = lazy(() => import('@/pages/PreferencesPage'))
const ScreenshotGalleryPage = lazy(() => import('@/pages/ScreenshotGalleryPage'))
const TestLibraryPage = lazy(() => import('@/pages/TestLibraryPage'))
const ExportImportPage = lazy(() => import('@/pages/ExportImportPage'))
const CollaborationPage = lazy(() => import('@/pages/CollaborationPage'))
const TestPrioritizationPage = lazy(() => import('@/pages/TestPrioritizationPage'))
const RootCauseAnalysisPage = lazy(() => import('@/pages/RootCauseAnalysisPage'))
const MockServerPage = lazy(() => import('@/pages/MockServerPage'))
const TestMetricsPage = lazy(() => import('@/pages/TestMetricsPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
    </div>
  )
}

function withPageErrorBoundary(element: React.ReactNode) {
  return <PageErrorBoundary>{element}</PageErrorBoundary>
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <KeyboardShortcuts>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={withPageErrorBoundary(<DashboardPage />)} />
                  <Route path="/excel" element={withPageErrorBoundary(<ExcelUploadPage />)} />
                  <Route path="/teams" element={withPageErrorBoundary(<TeamsPage />)} />
                  <Route path="/reports" element={withPageErrorBoundary(<ReportsPage />)} />
                  <Route path="/audit" element={withPageErrorBoundary(<AuditPage />)} />
                  <Route path="/test-cases" element={withPageErrorBoundary(<TestCasesPage />)} />
                  <Route path="/api-runner" element={withPageErrorBoundary(<ApiTestRunnerPage />)} />
                  <Route path="/web-runner" element={withPageErrorBoundary(<WebTestRunnerPage />)} />
                  <Route path="/mobile-runner" element={withPageErrorBoundary(<MobileTestRunnerPage />)} />
                  <Route path="/security" element={withPageErrorBoundary(<SecurityScannerPage />)} />
                  <Route path="/qa-dashboard" element={withPageErrorBoundary(<QADashboardPage />)} />
                  <Route path="/test-data" element={withPageErrorBoundary(<TestDataGeneratorPage />)} />
                  <Route path="/environments" element={withPageErrorBoundary(<EnvironmentManagerPage />)} />
                  <Route path="/notifications" element={withPageErrorBoundary(<NotificationsPage />)} />
                  <Route path="/cicd" element={withPageErrorBoundary(<CICDPage />)} />
                  <Route path="/accessibility" element={withPageErrorBoundary(<AccessibilityPage />)} />
                  <Route path="/log-analyzer" element={withPageErrorBoundary(<LogAnalyzerPage />)} />
                  <Route path="/ai-hub" element={withPageErrorBoundary(<AIHubPage />)} />
                  <Route path="/contracts" element={withPageErrorBoundary(<ContractTestingPage />)} />
                  <Route path="/chaos" element={withPageErrorBoundary(<ChaosEngineeringPage />)} />
                  <Route path="/db-testing" element={withPageErrorBoundary(<DatabaseTestingPage />)} />
                  <Route path="/snapshots" element={withPageErrorBoundary(<SnapshotTestingPage />)} />
                  <Route path="/flake-analyzer" element={withPageErrorBoundary(<FlakeAnalyzerPage />)} />
                  <Route path="/compliance" element={withPageErrorBoundary(<CompliancePage />)} />
                  <Route path="/coverage" element={withPageErrorBoundary(<CoverageMapperPage />)} />
                  <Route path="/release-gate" element={withPageErrorBoundary(<ReleaseGatePage />)} />
                  <Route path="/recorder" element={withPageErrorBoundary(<TestRecorderPage />)} />
                  <Route path="/scheduler" element={withPageErrorBoundary(<TestSchedulerPage />)} />
                  <Route path="/team" element={withPageErrorBoundary(<TeamManagementPage />)} />
                  <Route path="/projects" element={withPageErrorBoundary(<ProjectsPage />)} />
                  <Route path="/pdf-reports" element={withPageErrorBoundary(<PDFReportPage />)} />
                  <Route path="/custom-dashboard" element={withPageErrorBoundary(<CustomDashboardPage />)} />
                  <Route path="/webhooks" element={withPageErrorBoundary(<WebhooksPage />)} />
                  <Route path="/api-analytics" element={withPageErrorBoundary(<APIAnalyticsPage />)} />
                  <Route path="/data-masking" element={withPageErrorBoundary(<DataMaskingPage />)} />
                  <Route path="/docs" element={withPageErrorBoundary(<DocsPage />)} />
                  <Route path="/search" element={withPageErrorBoundary(<GlobalSearchPage />)} />
                  <Route path="/onboarding" element={withPageErrorBoundary(<OnboardingPage />)} />
                  <Route path="/activity" element={withPageErrorBoundary(<ActivityFeedPage />)} />
                  <Route path="/changelog" element={withPageErrorBoundary(<ChangelogPage />)} />
                  <Route path="/preferences" element={withPageErrorBoundary(<PreferencesPage />)} />
                  <Route path="/screenshots" element={withPageErrorBoundary(<ScreenshotGalleryPage />)} />
                  <Route path="/test-library" element={withPageErrorBoundary(<TestLibraryPage />)} />
                  <Route path="/export-import" element={withPageErrorBoundary(<ExportImportPage />)} />
                  <Route path="/collaboration" element={withPageErrorBoundary(<CollaborationPage />)} />
                  <Route path="/test-priority" element={withPageErrorBoundary(<TestPrioritizationPage />)} />
                  <Route path="/root-cause" element={withPageErrorBoundary(<RootCauseAnalysisPage />)} />
                  <Route path="/mock-server" element={withPageErrorBoundary(<MockServerPage />)} />
                  <Route path="/test-metrics" element={withPageErrorBoundary(<TestMetricsPage />)} />
                  <Route path="/setup" element={withPageErrorBoundary(<SetupWizardPage />)} />
                  <Route path="/settings" element={withPageErrorBoundary(<SettingsPage />)} />
                </Route>
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            <SessionTimeout />
            <FeedbackWidget />
            <ToastContainer />
          </Suspense>
          </KeyboardShortcuts>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
