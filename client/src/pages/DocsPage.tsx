import { useState } from 'react'
import {
  BookOpen, FileText, ClipboardList, Code, HelpCircle, ChevronDown,
  ChevronRight, ArrowRight, Info, Layers, Cpu, Database as DatabaseIcon,
  Globe, Shield, Zap, Sparkles, Flame, BarChart3, Eye, Search
} from 'lucide-react'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'

// ─── HowItWorks Steps ───────────────────────────────────��──────────────────

const howItWorksSteps = [
  {
    title: 'Browse Documents',
    description: 'Use the left sidebar to navigate between Requirements, User Stories, Implementation, and How It Works documentation.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Select</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Read</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Explore Requirements',
    description: 'View all functional requirements organized by phase and module. Expand sections to see individual requirement IDs, descriptions, and priorities.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Requirements</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Search className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Expand</span>
        </div>
      </div>
    ),
  },
  {
    title: 'View Stories',
    description: 'Browse all 43 epics with story counts and total story points. Each epic maps to a phase or addon module.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Layers className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Epics</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Story Points</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Read Guides',
    description: 'Step-by-step How It Works guides for every feature across all 16 phases and 9 addon modules.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <HelpCircle className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Guides</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Eye className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Follow</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ───────────────────────────────────────────────────────────────────

type DocTab = 'requirements' | 'stories' | 'implementation' | 'how-it-works'

interface ExpandableSection {
  title: string
  items: { id?: string; text: string; priority?: string }[]
}

// ─── Expandable Section Component ────────────────────────────────────────────

function ExpandableCard({ title, children, defaultOpen = false }: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-5 py-4 text-left hover:bg-sidebar transition-colors"
      >
        <span className="text-sm font-semibold text-text-primary">{title}</span>
        {isOpen ? (
          <ChevronDown size={16} className="text-text-muted" />
        ) : (
          <ChevronRight size={16} className="text-text-muted" />
        )}
      </button>
      {isOpen && (
        <div className="px-5 pb-4 border-t border-border">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Requirements Data ───────────────────────────────────────────────────────

const requirementSections: { phase: string; sections: ExpandableSection[] }[] = [
  {
    phase: 'Phase 1 -- Ticketing Platform',
    sections: [
      { title: '1.1 Authentication & Access Control', items: [
        { id: 'AUTH-001', text: 'User registration with email/password', priority: 'P0' },
        { id: 'AUTH-002', text: 'Secure login via Firebase Auth SDK', priority: 'P0' },
        { id: 'AUTH-003', text: 'Session persistence with Firebase Auth state observer', priority: 'P0' },
        { id: 'AUTH-004', text: 'Role-based access via Firestore custom claims', priority: 'P1' },
        { id: 'AUTH-005', text: 'Google/Microsoft SSO via Firebase Auth providers', priority: 'P2' },
        { id: 'AUTH-006', text: 'Password reset via Firebase Auth email action', priority: 'P1' },
        { id: 'AUTH-007', text: 'Account lockout after failed attempts', priority: 'P1' },
      ]},
      { title: '1.2 First-Time Setup Wizard', items: [
        { id: 'SETUP-001', text: 'Step-by-step guided configuration flow', priority: 'P0' },
        { id: 'SETUP-002', text: 'Jira Cloud API configuration', priority: 'P0' },
        { id: 'SETUP-003', text: 'Confluence API configuration', priority: 'P0' },
        { id: 'SETUP-004', text: 'Microsoft Teams Graph API configuration', priority: 'P0' },
        { id: 'SETUP-005', text: 'Connection test via NestJS API endpoint', priority: 'P0' },
        { id: 'SETUP-006', text: 'Encrypted credential storage (AES-256)', priority: 'P0' },
        { id: 'SETUP-007', text: 'Edit/update existing integration settings', priority: 'P1' },
        { id: 'SETUP-008', text: 'Integration health status dashboard', priority: 'P1' },
      ]},
      { title: '1.3 Excel to Jira Automation', items: [
        { id: 'EXCEL-001', text: 'Upload Excel files (.xlsx, .xls, .csv)', priority: 'P0' },
        { id: 'EXCEL-002', text: 'Parse and display Excel data in preview table', priority: 'P0' },
        { id: 'EXCEL-003', text: 'Column-to-Jira-field mapping interface', priority: 'P0' },
        { id: 'EXCEL-006', text: 'Bulk Jira ticket creation via REST API', priority: 'P0' },
        { id: 'EXCEL-009', text: 'Save/load mapping templates', priority: 'P1' },
        { id: 'EXCEL-010', text: 'Duplicate detection before creation', priority: 'P1' },
      ]},
      { title: '1.4 Teams Chat to Jira Conversion', items: [
        { id: 'TEAMS-001', text: 'Authenticate with Microsoft Graph API', priority: 'P0' },
        { id: 'TEAMS-002', text: 'List and select Teams channels', priority: 'P0' },
        { id: 'TEAMS-003', text: 'Fetch messages with date range', priority: 'P0' },
        { id: 'TEAMS-006', text: 'Convert selected messages to Jira tickets', priority: 'P0' },
        { id: 'TEAMS-008', text: 'Batch ticket creation from messages', priority: 'P0' },
      ]},
      { title: '1.5 Confluence Reporting', items: [
        { id: 'CONF-001', text: 'Aggregate tickets within date range', priority: 'P0' },
        { id: 'CONF-003', text: 'Publish report to Confluence page', priority: 'P0' },
        { id: 'CONF-005', text: 'Formatted tables with ticket links', priority: 'P0' },
      ]},
      { title: '1.6 Dashboard & Audit', items: [
        { id: 'DASH-001', text: 'Metric cards, charts, activity timeline', priority: 'P1' },
        { id: 'AUDIT-001', text: 'Full activity audit log with search and export', priority: 'P1' },
      ]},
    ],
  },
  {
    phase: 'Phase 2-5 -- QA Testing',
    sections: [
      { title: '2.1 Test Case Management', items: [
        { id: 'TCM-001', text: 'Create test cases with steps and expected results', priority: 'P0' },
        { id: 'TCM-002', text: 'Organize into suites and folders', priority: 'P0' },
        { id: 'TCM-005', text: 'Test run execution with pass/fail/blocked', priority: 'P0' },
        { id: 'TCM-009', text: 'Auto bug filing on test failure', priority: 'P0' },
      ]},
      { title: '2.2 API Test Runner', items: [
        { id: 'API-001', text: 'Create API request collections', priority: 'P0' },
        { id: 'API-003', text: 'Request builder with assertions', priority: 'P0' },
        { id: 'API-006', text: 'Request chaining with variable extraction', priority: 'P0' },
        { id: 'API-008', text: 'Import Postman/Swagger/OpenAPI specs', priority: 'P0' },
      ]},
      { title: '3.1 Web UI Test Runner', items: [
        { id: 'WEB-001', text: 'Playwright test script execution', priority: 'P0' },
        { id: 'WEB-003', text: 'Cross-browser support (Chrome, Firefox, Safari)', priority: 'P0' },
        { id: 'WEB-005', text: 'Visual regression testing with screenshot diff', priority: 'P0' },
      ]},
      { title: '3.2 Mobile Test Runner', items: [
        { id: 'MOB-001', text: 'Appium/WebDriverIO test execution', priority: 'P0' },
        { id: 'MOB-003', text: 'Device manager with capabilities builder', priority: 'P0' },
      ]},
      { title: '3.3 Security Scanner', items: [
        { id: 'SEC-001', text: 'OWASP ZAP automated scanning', priority: 'P0' },
        { id: 'SEC-003', text: 'HTTP header analysis and SSL/TLS check', priority: 'P0' },
        { id: 'SEC-005', text: 'Severity classification with remediation', priority: 'P0' },
      ]},
    ],
  },
  {
    phase: 'Phase 6-10 -- Platform Features',
    sections: [
      { title: '6.1 Performance & Load Testing', items: [
        { id: 'PERF-001', text: 'k6 load testing with configurable VUs', priority: 'P0' },
        { id: 'PERF-004', text: 'Lighthouse performance audits', priority: 'P0' },
      ]},
      { title: '7.1 Test Data Generator', items: [
        { id: 'DATA-001', text: 'Schema-based fake data generation (Faker.js)', priority: 'P0' },
        { id: 'DATA-003', text: 'Export to JSON, CSV, SQL formats', priority: 'P0' },
      ]},
      { title: '7.2 Environment Manager', items: [
        { id: 'ENV-001', text: 'Register and monitor environments', priority: 'P0' },
        { id: 'ENV-003', text: 'Side-by-side config comparison', priority: 'P1' },
      ]},
      { title: '8.1 Notification Hub', items: [
        { id: 'NOTIF-001', text: 'Multi-channel alerts (Slack, Teams, Email)', priority: 'P0' },
        { id: 'NOTIF-003', text: 'Custom alert rules with conditions', priority: 'P1' },
      ]},
      { title: '9.1 CI/CD Integration', items: [
        { id: 'CICD-001', text: 'GitHub Actions, Jenkins, GitLab CI triggers', priority: 'P0' },
        { id: 'CICD-005', text: 'Quality gate with threshold enforcement', priority: 'P0' },
      ]},
      { title: '10.1 Accessibility Testing', items: [
        { id: 'A11Y-001', text: 'axe-core WCAG 2.1 AA/AAA scanning', priority: 'P0' },
        { id: 'A11Y-008', text: 'Color contrast checker', priority: 'P1' },
      ]},
      { title: '10.2 Log Analyzer', items: [
        { id: 'LOG-001', text: 'Connect to Cloud Logging, ELK, file logs', priority: 'P0' },
        { id: 'LOG-002', text: 'Error grouping by stack trace fingerprint', priority: 'P0' },
      ]},
    ],
  },
  {
    phase: 'Phase 11-13 -- AI & Intelligence',
    sections: [
      { title: '11.1 AI Intelligence Engine', items: [
        { id: 'AI-001', text: 'AI test case generator from Jira stories', priority: 'P0' },
        { id: 'AI-003', text: 'Generate Playwright test scripts', priority: 'P0' },
        { id: 'AI-004', text: 'Generate Appium test scripts', priority: 'P0' },
        { id: 'AI-006', text: 'AI release notes generator from Jira', priority: 'P0' },
        { id: 'AI-012', text: 'Auto-generate BDD/Gherkin feature files', priority: 'P2' },
      ]},
      { title: '12.1 Contract Testing', items: [
        { id: 'PACT-001', text: 'Consumer-driven contract definitions', priority: 'P0' },
        { id: 'PACT-002', text: 'Provider compliance verification', priority: 'P0' },
        { id: 'PACT-004', text: 'Breaking change alerts', priority: 'P1' },
      ]},
      { title: '13.1 Chaos Engineering', items: [
        { id: 'CHAOS-001', text: 'Inject network latency', priority: 'P0' },
        { id: 'CHAOS-002', text: 'HTTP error injection (500, 503, timeouts)', priority: 'P0' },
        { id: 'CHAOS-007', text: 'Blast radius controls', priority: 'P0' },
      ]},
    ],
  },
  {
    phase: 'Phase 14-16 -- Release Features',
    sections: [
      { title: '14.1 Database Testing', items: [
        { id: 'DB-001', text: 'PostgreSQL, MySQL, MongoDB connectors', priority: 'P0' },
        { id: 'DB-002', text: 'SQL query execution and validation', priority: 'P0' },
        { id: 'DB-003', text: 'Schema migration diff', priority: 'P1' },
      ]},
      { title: '14.2 Snapshot Testing', items: [
        { id: 'SNAP-001', text: 'API response and UI snapshot capture', priority: 'P0' },
        { id: 'SNAP-002', text: 'Deep-diff against baseline', priority: 'P0' },
      ]},
      { title: '15.1 Flake Analyzer', items: [
        { id: 'FLAKE-001', text: 'Track pass/fail history per test', priority: 'P0' },
        { id: 'FLAKE-002', text: 'Flake score calculation', priority: 'P0' },
        { id: 'FLAKE-003', text: 'Auto-quarantine flaky tests', priority: 'P1' },
      ]},
      { title: '15.2 Multi-Region Testing', items: [
        { id: 'REGION-001', text: 'Execute tests from multiple regions', priority: 'P0' },
        { id: 'REGION-002', text: 'Latency comparison across regions', priority: 'P0' },
      ]},
      { title: '16.1 Compliance Dashboard', items: [
        { id: 'COMP-001', text: 'SOC2 compliance checklist with evidence', priority: 'P0' },
        { id: 'COMP-002', text: 'GDPR compliance validation', priority: 'P0' },
        { id: 'COMP-007', text: 'Export compliance report for auditors', priority: 'P1' },
      ]},
      { title: '16.2 Coverage Mapper', items: [
        { id: 'COV-001', text: 'Import Istanbul/NYC/JaCoCo coverage reports', priority: 'P0' },
        { id: 'COV-002', text: 'Map code coverage to test cases', priority: 'P0' },
        { id: 'COV-003', text: 'Identify uncovered code paths', priority: 'P0' },
      ]},
      { title: '16.3 Release Readiness Gate', items: [
        { id: 'RRG-001', text: 'Aggregate quality signals into go/no-go', priority: 'P0' },
        { id: 'RRG-003', text: 'Visual readiness scorecard', priority: 'P0' },
        { id: 'RRG-006', text: 'Approval workflow with multi-role sign-off', priority: 'P1' },
      ]},
    ],
  },
  {
    phase: 'Platform Addons',
    sections: [
      { title: '4.1 No-Code Test Recorder', items: [
        { id: 'ADD-001', text: 'Visual step builder for creating tests without code', priority: 'P1' },
        { id: 'ADD-002', text: 'Action types: Click, Type, Navigate, Wait, Assert', priority: 'P1' },
        { id: 'ADD-003', text: 'Auto-generate Playwright/Appium scripts from steps', priority: 'P1' },
        { id: 'ADD-004', text: 'Save generated tests to Web/Mobile runner modules', priority: 'P1' },
      ]},
      { title: '4.2 Test Scheduling (Cron)', items: [
        { id: 'ADD-010', text: 'Schedule API/Web/Security/Accessibility tests', priority: 'P1' },
        { id: 'ADD-011', text: 'Cron expression builder UI', priority: 'P1' },
        { id: 'ADD-012', text: 'Manual "Run Now" trigger per schedule', priority: 'P1' },
        { id: 'ADD-013', text: 'Execution history with status and duration', priority: 'P1' },
      ]},
      { title: '4.3 Team Management', items: [
        { id: 'ADD-020', text: 'Invite team members via email', priority: 'P1' },
        { id: 'ADD-021', text: 'Role assignment (Admin/Manager/User)', priority: 'P1' },
        { id: 'ADD-022', text: 'Team settings and defaults', priority: 'P1' },
      ]},
      { title: '4.4 Multi-Project Support', items: [
        { id: 'ADD-030', text: 'Create and switch between projects', priority: 'P1' },
        { id: 'ADD-031', text: 'Per-project Jira configuration', priority: 'P1' },
        { id: 'ADD-032', text: 'Project-scoped data isolation', priority: 'P2' },
      ]},
      { title: '4.5 PDF Report Generator', items: [
        { id: 'ADD-040', text: 'Generate branded PDF reports', priority: 'P1' },
        { id: 'ADD-041', text: 'Report types: QA Summary, Security, Performance, Release', priority: 'P1' },
        { id: 'ADD-042', text: 'Print-optimized CSS with headers/footers', priority: 'P1' },
      ]},
      { title: '4.6 Custom Dashboard Builder', items: [
        { id: 'ADD-050', text: 'Drag-and-drop widget layout', priority: 'P2' },
        { id: 'ADD-051', text: 'Configurable data sources per widget', priority: 'P2' },
        { id: 'ADD-052', text: 'Save/load custom layouts', priority: 'P2' },
      ]},
      { title: '4.7 Webhook Management', items: [
        { id: 'ADD-060', text: 'Incoming webhook endpoints', priority: 'P2' },
        { id: 'ADD-061', text: 'Outgoing webhook configuration', priority: 'P2' },
        { id: 'ADD-062', text: 'Webhook delivery history and testing', priority: 'P2' },
      ]},
      { title: '4.8 API Usage Analytics', items: [
        { id: 'ADD-070', text: 'API call volume tracking', priority: 'P2' },
        { id: 'ADD-071', text: 'Response time and error rate charts', priority: 'P2' },
        { id: 'ADD-072', text: 'Per-endpoint performance breakdown', priority: 'P2' },
      ]},
      { title: '4.9 Data Masking', items: [
        { id: 'ADD-080', text: 'PII field pattern matching', priority: 'P2' },
        { id: 'ADD-081', text: 'Multiple masking types (full/partial/hash/redact)', priority: 'P2' },
        { id: 'ADD-082', text: 'Apply to test data generator output', priority: 'P2' },
      ]},
    ],
  },
]

// ─── User Stories Data ───────────────────────────────────────────────────────

const epicSummary = [
  { epic: 'Auth & Access (Firebase)', phase: '1', stories: 5, sp: 18 },
  { epic: 'Setup & Integration', phase: '1', stories: 5, sp: 31 },
  { epic: 'Excel to Jira', phase: '1', stories: 4, sp: 29 },
  { epic: 'Teams to Jira', phase: '1', stories: 4, sp: 26 },
  { epic: 'Confluence Reporting', phase: '1', stories: 3, sp: 21 },
  { epic: 'Audit & Tracking', phase: '1', stories: 2, sp: 8 },
  { epic: 'Dashboard (Ticketing)', phase: '1', stories: 1, sp: 8 },
  { epic: 'Test Case Management', phase: '2', stories: 3, sp: 21 },
  { epic: 'API Test Runner', phase: '2', stories: 2, sp: 26 },
  { epic: 'Auto Bug Filing Engine', phase: '2', stories: 1, sp: 13 },
  { epic: 'Web UI Test Runner', phase: '3', stories: 3, sp: 34 },
  { epic: 'Mobile Test Runner (Appium)', phase: '4', stories: 3, sp: 29 },
  { epic: 'Security Scanner', phase: '5', stories: 2, sp: 21 },
  { epic: 'Unified QA Dashboard', phase: '5', stories: 1, sp: 13 },
  { epic: 'Performance & Load Testing', phase: '6', stories: 2, sp: 18 },
  { epic: 'Test Data Generator', phase: '7', stories: 1, sp: 8 },
  { epic: 'Environment Manager', phase: '7', stories: 1, sp: 8 },
  { epic: 'Notification Hub', phase: '8', stories: 1, sp: 13 },
  { epic: 'CI/CD Integration', phase: '9', stories: 1, sp: 13 },
  { epic: 'Accessibility Testing', phase: '10', stories: 1, sp: 8 },
  { epic: 'Log Analyzer', phase: '10', stories: 1, sp: 8 },
  { epic: 'AI Test Case Generator', phase: '11', stories: 2, sp: 21 },
  { epic: 'AI Test Script Generator', phase: '11', stories: 2, sp: 21 },
  { epic: 'AI Appium Script Generator', phase: '11', stories: 1, sp: 13 },
  { epic: 'AI Release Notes Generator', phase: '11', stories: 2, sp: 21 },
  { epic: 'Contract Testing (Pact)', phase: '12', stories: 1, sp: 13 },
  { epic: 'Chaos Engineering', phase: '13', stories: 1, sp: 13 },
  { epic: 'Database Testing', phase: '14', stories: 1, sp: 13 },
  { epic: 'Snapshot Testing', phase: '14', stories: 1, sp: 8 },
  { epic: 'Test Flake Analyzer', phase: '15', stories: 1, sp: 8 },
  { epic: 'Multi-Region Testing', phase: '15', stories: 1, sp: 8 },
  { epic: 'Compliance Dashboard', phase: '16', stories: 1, sp: 13 },
  { epic: 'Test Coverage Mapper', phase: '16', stories: 1, sp: 8 },
  { epic: 'Release Readiness Gate', phase: '16', stories: 1, sp: 13 },
  { epic: 'No-Code Test Recorder', phase: 'Addon', stories: 2, sp: 16 },
  { epic: 'Test Scheduling (Cron)', phase: 'Addon', stories: 2, sp: 13 },
  { epic: 'Team Management', phase: 'Addon', stories: 1, sp: 13 },
  { epic: 'Multi-Project Support', phase: 'Addon', stories: 1, sp: 13 },
  { epic: 'PDF Report Generator', phase: 'Addon', stories: 1, sp: 8 },
  { epic: 'Custom Dashboard Builder', phase: 'Addon', stories: 1, sp: 13 },
  { epic: 'Webhook Management', phase: 'Addon', stories: 1, sp: 8 },
  { epic: 'API Usage Analytics', phase: 'Addon', stories: 1, sp: 8 },
  { epic: 'Data Masking', phase: 'Addon', stories: 1, sp: 8 },
]

// ─── Implementation Data ─────────────────────────────────────────────────────

const techStack = [
  { layer: 'Frontend', tech: 'React 18 + TypeScript + Vite + Tailwind CSS' },
  { layer: 'UI Library', tech: 'Tailwind CSS + shadcn/ui' },
  { layer: 'State', tech: 'Zustand + React Query (TanStack Query)' },
  { layer: 'Auth', tech: 'Firebase Authentication' },
  { layer: 'Database', tech: 'Cloud Firestore' },
  { layer: 'File Storage', tech: 'Firebase Storage' },
  { layer: 'Hosting', tech: 'Firebase Hosting (frontend)' },
  { layer: 'API Server', tech: 'NestJS + TypeScript on Cloud Run' },
  { layer: 'AI Engine', tech: 'Claude API / OpenAI API (configurable)' },
  { layer: 'Web E2E', tech: 'Playwright (cross-browser)' },
  { layer: 'Mobile E2E', tech: 'Appium + WebDriverIO' },
  { layer: 'Load Testing', tech: 'k6 engine' },
  { layer: 'Security', tech: 'OWASP ZAP (headless) + custom scanners' },
  { layer: 'Accessibility', tech: 'axe-core' },
  { layer: 'CI/CD', tech: 'GitHub Actions + Jenkins + GitLab CI' },
  { layer: 'Contract Testing', tech: 'Pact.js' },
  { layer: 'Chaos Engineering', tech: 'Chaos Toolkit / custom fault injector' },
]

const phaseSummary = [
  { phase: '1', focus: 'Ticketing Platform', sprints: 7, deliverables: 'Auth, Excel, Teams, Confluence, Dashboard' },
  { phase: '2', focus: 'QA Core', sprints: 4, deliverables: 'Test Cases, API Runner, Auto Bug Filing' },
  { phase: '3', focus: 'Web Testing', sprints: 3, deliverables: 'Playwright Runner, Visual Regression' },
  { phase: '4', focus: 'Mobile Testing', sprints: 3, deliverables: 'Appium Runner, Device Manager' },
  { phase: '5', focus: 'Security + QA Dashboard', sprints: 3, deliverables: 'OWASP Scanner, Unified Dashboard' },
  { phase: '6', focus: 'Performance Testing', sprints: 2, deliverables: 'k6 Load Testing, Lighthouse' },
  { phase: '7', focus: 'Test Data + Environments', sprints: 3, deliverables: 'Data Generator, Env Manager' },
  { phase: '8', focus: 'Notifications', sprints: 2, deliverables: 'Multi-channel Alerts, Escalation' },
  { phase: '9', focus: 'CI/CD Integration', sprints: 2, deliverables: 'GitHub/Jenkins/GitLab, Quality Gates' },
  { phase: '10', focus: 'Accessibility + Logs', sprints: 3, deliverables: 'WCAG Scanner, Log Analyzer' },
  { phase: '11', focus: 'AI Intelligence Engine', sprints: 4, deliverables: 'Test Case/Script/Release Notes Gen' },
  { phase: '12', focus: 'Contract Testing', sprints: 2, deliverables: 'Pact.js, Breaking Change Detection' },
  { phase: '13', focus: 'Chaos Engineering', sprints: 2, deliverables: 'Fault Injection, Recovery Validation' },
  { phase: '14', focus: 'DB Testing + Snapshots', sprints: 3, deliverables: 'SQL/NoSQL, Schema Diff, JSON Snapshots' },
  { phase: '15', focus: 'Flake + Multi-Region', sprints: 3, deliverables: 'Flake Detection, Geographic Testing' },
  { phase: '16', focus: 'Compliance + Coverage + Gate', sprints: 4, deliverables: 'SOC2/GDPR, Coverage, Release Gate' },
  { phase: 'A1', focus: 'No-Code Test Recorder', sprints: 1, deliverables: 'Visual step builder, Script generation' },
  { phase: 'A2', focus: 'Test Scheduling', sprints: 1, deliverables: 'Cron scheduler, Execution history' },
  { phase: 'A3', focus: 'Team Management', sprints: 1, deliverables: 'Invitations, Roles, Team settings' },
  { phase: 'A4', focus: 'Multi-Project', sprints: 1, deliverables: 'Project CRUD, Switching, Isolation' },
  { phase: 'A5', focus: 'PDF Reports', sprints: 1, deliverables: 'Branded PDFs, Print-optimized CSS' },
  { phase: 'A6', focus: 'Custom Dashboards', sprints: 2, deliverables: 'Drag-drop widgets, Layout persistence' },
  { phase: 'A7', focus: 'Webhooks', sprints: 1, deliverables: 'Incoming/outgoing, Delivery history' },
  { phase: 'A8', focus: 'API Analytics', sprints: 1, deliverables: 'Volume, Latency, Error tracking' },
  { phase: 'A9', focus: 'Data Masking', sprints: 1, deliverables: 'PII patterns, Masking types' },
]

// ─── How It Works Data ───────────────────────────────────────────────────────

const howItWorksGuides: { section: string; guides: { title: string; steps: string[] }[] }[] = [
  {
    section: 'Core Features (Phase 1)',
    guides: [
      { title: 'Excel to Jira', steps: ['Upload .xlsx/.csv file', 'Map columns to Jira fields', 'Validate all rows', 'Bulk create tickets in Jira'] },
      { title: 'Teams Chat to Jira', steps: ['Select Team and Channel', 'Filter messages by date/keyword', 'Select messages to convert', 'Create Jira tickets'] },
      { title: 'Confluence Reports', steps: ['Select date range', 'Review ticket summary table', 'Click Publish to Confluence', 'Report created with formatted tables'] },
    ],
  },
  {
    section: 'QA Testing (Phase 2-5)',
    guides: [
      { title: 'Test Case Management', steps: ['Create suites and folders', 'Write test cases with steps', 'Create test runs and assign QA', 'Execute and mark pass/fail'] },
      { title: 'API Test Runner', steps: ['Create request collection', 'Build requests with assertions', 'Chain requests with variables', 'Run collection and view results'] },
      { title: 'Web UI Test Runner', steps: ['Write Playwright test script', 'Configure browser and viewport', 'Run test with real browser', 'View results and screenshots'] },
      { title: 'Mobile Test Runner', steps: ['Select device/emulator', 'Upload .apk or .ipa', 'Set capabilities and write script', 'Run on device with logs'] },
      { title: 'Security Scanner', steps: ['Enter target URL', 'Choose scan type', 'View findings by severity', 'Auto-file critical bugs'] },
    ],
  },
  {
    section: 'Platform (Phase 6-10)',
    guides: [
      { title: 'Performance Testing', steps: ['Configure load test (VUs, duration)', 'Run k6 load test', 'Run Lighthouse audit', 'View response time and scores'] },
      { title: 'Test Data Generator', steps: ['Build schema with field types', 'Use presets or custom', 'Generate up to 100K records', 'Export as JSON, CSV, or SQL'] },
      { title: 'CI/CD Integration', steps: ['Select test collection', 'Configure webhook URL', 'Set quality gate thresholds', 'CI pipeline triggers and checks'] },
      { title: 'Accessibility Testing', steps: ['Enter target page URL', 'Run WCAG scan', 'Review violations with severity', 'Color contrast checker'] },
    ],
  },
  {
    section: 'AI & Intelligence (Phase 11-13)',
    guides: [
      { title: 'AI Test Case Generator', steps: ['Select Jira story or API spec', 'Choose detail level', 'Click Generate', 'Review and save test cases'] },
      { title: 'AI Script Generator', steps: ['Choose: Playwright, Appium, or API', 'Describe test or paste case', 'Select language', 'Generate and copy script'] },
      { title: 'Contract Testing', steps: ['Define consumer contract', 'Click Verify provider', 'View diff and breaking changes', 'CI/CD gate blocks on violations'] },
      { title: 'Chaos Engineering', steps: ['Build experiment with fault type', 'Configure duration and intensity', 'Run with safety controls', 'Monitor and view results'] },
    ],
  },
  {
    section: 'Release (Phase 14-16)',
    guides: [
      { title: 'Database Testing', steps: ['Connect to PostgreSQL/MySQL/MongoDB', 'Execute queries and validate', 'Run schema diff across environments', 'Check data integrity'] },
      { title: 'Snapshot Testing', steps: ['Capture API or UI snapshot', 'Compare against baseline', 'Review added/removed/changed', 'Accept as new baseline'] },
      { title: 'Release Readiness Gate', steps: ['Configure criteria thresholds', 'Click Evaluate', 'Review scorecard (green/yellow/red)', 'Collect sign-offs and release'] },
    ],
  },
  {
    section: 'Platform Addons',
    guides: [
      { title: 'No-Code Test Recorder', steps: ['Enter target URL', 'Add test steps visually', 'Reorder and edit steps', 'Generate Playwright/Appium script'] },
      { title: 'Test Scheduling', steps: ['Create schedule and select test', 'Set cron frequency', 'Enable/disable schedules', 'View execution history'] },
      { title: 'Team Management', steps: ['Create team', 'Invite members via email', 'Assign roles', 'Configure team settings'] },
      { title: 'Multi-Project', steps: ['Create project', 'Switch via project dropdown', 'Configure per-project Jira', 'Data isolated per project'] },
      { title: 'PDF Reports', steps: ['Select report type', 'Set filters and options', 'Preview HTML report', 'Download as PDF'] },
      { title: 'Custom Dashboards', steps: ['Add widgets from library', 'Configure data sources', 'Drag and drop layout', 'Save custom layout'] },
      { title: 'Webhooks', steps: ['Create incoming/outgoing webhook', 'Select events to trigger', 'Test payload delivery', 'View delivery history'] },
      { title: 'API Analytics', steps: ['View volume dashboard', 'Filter by date range', 'Check response time charts', 'Review per-endpoint breakdown'] },
      { title: 'Data Masking', steps: ['Create masking rule', 'Select field pattern and mask type', 'Preview masked output', 'Apply to test data generator'] },
    ],
  },
]

// ─── Tab Content Components ──────────────────────────────────────────────────

function RequirementsTab() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <ClipboardList className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">Requirements Specification</h3>
            <p className="text-xs text-text-secondary">All functional requirements across 16 phases + 9 addons</p>
          </div>
        </div>
      </div>

      {requirementSections.map((phaseGroup) => (
        <div key={phaseGroup.phase} className="space-y-3">
          <h4 className="text-sm font-bold uppercase tracking-widest text-accent-light px-1">
            {phaseGroup.phase}
          </h4>
          {phaseGroup.sections.map((section) => (
            <ExpandableCard key={section.title} title={section.title}>
              <div className="mt-3 space-y-2">
                {section.items.map((item) => (
                  <div key={item.id || item.text} className="flex items-start gap-3 py-1.5">
                    {item.id && (
                      <span className="inline-flex items-center rounded-md bg-sidebar px-2 py-0.5 text-[11px] font-mono font-medium text-accent-light whitespace-nowrap">
                        {item.id}
                      </span>
                    )}
                    <span className="text-sm text-text-secondary flex-1">{item.text}</span>
                    {item.priority && (
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap',
                        item.priority === 'P0' ? 'bg-status-red/10 text-status-red' :
                        item.priority === 'P1' ? 'bg-status-yellow/10 text-status-yellow' :
                        'bg-text-muted/10 text-text-muted'
                      )}>
                        {item.priority}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </ExpandableCard>
          ))}
        </div>
      ))}
    </div>
  )
}

function StoriesTab() {
  const totalStories = epicSummary.reduce((sum, e) => sum + e.stories, 0)
  const totalSP = epicSummary.reduce((sum, e) => sum + e.sp, 0)

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <Layers className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">User Stories</h3>
            <p className="text-xs text-text-secondary">43 epics, {totalStories} stories, {totalSP} story points</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="rounded-lg bg-sidebar p-3 text-center">
            <p className="text-2xl font-bold text-accent">{epicSummary.length}</p>
            <p className="text-[11px] text-text-muted uppercase tracking-wide mt-1">Epics</p>
          </div>
          <div className="rounded-lg bg-sidebar p-3 text-center">
            <p className="text-2xl font-bold text-status-green">{totalStories}</p>
            <p className="text-[11px] text-text-muted uppercase tracking-wide mt-1">Stories</p>
          </div>
          <div className="rounded-lg bg-sidebar p-3 text-center">
            <p className="text-2xl font-bold text-status-yellow">{totalSP}</p>
            <p className="text-[11px] text-text-muted uppercase tracking-wide mt-1">Story Points</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-sidebar">
          <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold uppercase tracking-widest text-text-muted">
            <div className="col-span-6">Epic</div>
            <div className="col-span-2 text-center">Phase</div>
            <div className="col-span-2 text-center">Stories</div>
            <div className="col-span-2 text-center">SP</div>
          </div>
        </div>
        <div className="divide-y divide-border">
          {epicSummary.map((epic) => (
            <div key={epic.epic} className="grid grid-cols-12 gap-2 px-5 py-3 items-center hover:bg-sidebar/50 transition-colors">
              <div className="col-span-6 text-sm text-text-primary font-medium">{epic.epic}</div>
              <div className="col-span-2 text-center">
                <span className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                  epic.phase === 'Addon' ? 'bg-accent/10 text-accent-light' : 'bg-sidebar text-text-secondary'
                )}>
                  {epic.phase}
                </span>
              </div>
              <div className="col-span-2 text-center text-sm text-text-secondary">{epic.stories}</div>
              <div className="col-span-2 text-center text-sm font-semibold text-text-primary">{epic.sp}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-12 gap-2 px-5 py-3 border-t-2 border-accent/30 bg-sidebar">
          <div className="col-span-6 text-sm font-bold text-text-primary">Grand Total</div>
          <div className="col-span-2 text-center text-[11px] font-bold text-text-muted">1-16 + Addons</div>
          <div className="col-span-2 text-center text-sm font-bold text-accent">{totalStories}</div>
          <div className="col-span-2 text-center text-sm font-bold text-accent">{totalSP}</div>
        </div>
      </div>
    </div>
  )
}

function ImplementationTab() {
  const totalSprints = phaseSummary.reduce((sum, p) => sum + p.sprints, 0)

  return (
    <div className="space-y-6">
      {/* Architecture */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <Cpu className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">Architecture Overview</h3>
            <p className="text-xs text-text-secondary">Hybrid Firebase + NestJS on Cloud Run</p>
          </div>
        </div>
        <div className="rounded-lg bg-sidebar border border-border p-4 font-mono text-xs text-text-secondary leading-relaxed whitespace-pre overflow-x-auto">
{`Frontend (React + Vite)  ->  Firebase Hosting (CDN)
         |                         |
   Firebase Auth            Cloud Firestore
   Firebase Storage         Firebase Cloud Functions
         |
   NestJS API  ->  Google Cloud Run (auto-scales)
         |
   External APIs: Jira, Confluence, MS Teams, Claude AI
   Test Engines: Playwright, Appium/WebDriverIO`}
        </div>
      </div>

      {/* Tech Stack */}
      <ExpandableCard title="Tech Stack" defaultOpen>
        <div className="mt-3 space-y-1.5">
          {techStack.map((item) => (
            <div key={item.layer} className="flex items-center gap-3 py-1.5">
              <span className="text-xs font-semibold text-accent-light w-28 shrink-0">{item.layer}</span>
              <span className="text-sm text-text-secondary">{item.tech}</span>
            </div>
          ))}
        </div>
      </ExpandableCard>

      {/* Phase Summary */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-sidebar flex items-center justify-between">
          <span className="text-sm font-semibold text-text-primary">Phase Summary</span>
          <span className="text-xs text-text-muted">{totalSprints} sprints total</span>
        </div>
        <div className="px-5 py-2 border-b border-border bg-sidebar">
          <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold uppercase tracking-widest text-text-muted">
            <div className="col-span-1">Phase</div>
            <div className="col-span-3">Focus</div>
            <div className="col-span-1 text-center">Sprints</div>
            <div className="col-span-7">Key Deliverables</div>
          </div>
        </div>
        <div className="divide-y divide-border">
          {phaseSummary.map((phase) => (
            <div key={phase.phase} className="grid grid-cols-12 gap-2 px-5 py-2.5 items-center hover:bg-sidebar/50 transition-colors">
              <div className="col-span-1">
                <span className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold',
                  phase.phase.startsWith('A') ? 'bg-accent/10 text-accent-light' : 'bg-sidebar text-text-secondary'
                )}>
                  {phase.phase}
                </span>
              </div>
              <div className="col-span-3 text-sm font-medium text-text-primary">{phase.focus}</div>
              <div className="col-span-1 text-center text-sm text-text-secondary">{phase.sprints}</div>
              <div className="col-span-7 text-xs text-text-muted">{phase.deliverables}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Firestore Collections */}
      <ExpandableCard title="Firestore Collections">
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            'users', 'ticketBatches', 'auditLogs', 'testSuites', 'testRuns',
            'apiCollections', 'testExecutions', 'securityScans', 'performanceRuns',
            'environments', 'notifications', 'aiGenerations', 'releaseNotes',
            'contracts', 'chaosExperiments', 'dbConnections', 'dbTestRuns',
            'snapshots', 'flakeRecords', 'regionTestRuns', 'complianceChecklists',
            'coverageReports', 'releaseGates', 'schedules', 'teams', 'projects',
            'webhooks', 'apiMetrics', 'maskingRules', 'dashboardLayouts',
          ].map((col) => (
            <div key={col} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-sidebar transition-colors">
              <DatabaseIcon size={14} className="text-accent shrink-0" />
              <span className="text-sm text-text-secondary font-mono">{col}</span>
            </div>
          ))}
        </div>
      </ExpandableCard>
    </div>
  )
}

function HowItWorksTab() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <HelpCircle className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">How It Works</h3>
            <p className="text-xs text-text-secondary">Step-by-step guides for every feature</p>
          </div>
        </div>
      </div>

      {howItWorksGuides.map((section) => (
        <div key={section.section} className="space-y-3">
          <h4 className="text-sm font-bold uppercase tracking-widest text-accent-light px-1">
            {section.section}
          </h4>
          {section.guides.map((guide) => (
            <ExpandableCard key={guide.title} title={guide.title}>
              <div className="mt-3 space-y-2">
                {guide.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 py-1">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[11px] font-bold text-accent">
                      {i + 1}
                    </span>
                    <span className="text-sm text-text-secondary">{step}</span>
                  </div>
                ))}
              </div>
            </ExpandableCard>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Tab Config ──────────────────────────────────────────────────────────────

const tabs: { id: DocTab; label: string; icon: typeof FileText }[] = [
  { id: 'requirements', label: 'Requirements', icon: ClipboardList },
  { id: 'stories', label: 'User Stories', icon: Layers },
  { id: 'implementation', label: 'Implementation', icon: Code },
  { id: 'how-it-works', label: 'How It Works', icon: HelpCircle },
]

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<DocTab>('requirements')
  const [showHowItWorks, setShowHowItWorks] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Documentation</h1>
          <p className="text-sm text-text-secondary mt-1">
            Browse all project documentation in one place
          </p>
        </div>
        <button
          onClick={() => setShowHowItWorks(true)}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-sidebar transition-colors"
        >
          <Info size={16} />
          How It Works
        </button>
      </div>

      {/* Layout: sidebar + content */}
      <div className="flex gap-6">
        {/* Left Sidebar - Tab Navigation */}
        <div className="w-56 shrink-0">
          <div className="sticky top-6 rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                Documents
              </p>
            </div>
            <div className="p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-accent-bg text-accent-light'
                      : 'text-text-secondary hover:bg-sidebar hover:text-text-primary'
                  )}
                >
                  <tab.icon size={16} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Content Panel */}
        <div className="flex-1 min-w-0">
          {activeTab === 'requirements' && <RequirementsTab />}
          {activeTab === 'stories' && <StoriesTab />}
          {activeTab === 'implementation' && <ImplementationTab />}
          {activeTab === 'how-it-works' && <HowItWorksTab />}
        </div>
      </div>

      {/* HowItWorks Modal */}
      <HowItWorks
        steps={howItWorksSteps}
        isOpen={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
      />
    </div>
  )
}
