# Implementation Plan — Intelligent Test Automation & Ticketing Platform

## Document Info

| Field   | Value                                       |
|---------|---------------------------------------------|
| Version | 2.0                                         |
| Created | 2026-04-04                                  |
| Status  | Draft                                       |
| Arch    | Hybrid — Firebase + NestJS on Cloud Run     |

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                  FRONTEND (React + Vite + TS)                 │
│   ┌──────┐ ┌────────┐ ┌───────┐ ┌──────┐ ┌───────────┐      │
│   │ Auth │ │ Setup  │ │ Excel │ │Teams │ │ Confluence│      │
│   │Pages │ │ Wizard │ │Upload │ │Chat  │ │ Reports   │      │
│   └──┬───┘ └───┬────┘ └──┬────┘ └──┬───┘ └─────┬─────┘      │
│      └─────────┴─────────┴─────────┴───────────┘             │
│                          │                                    │
│          Zustand + React Query + Firebase SDK                 │
└─────────┬────────────────┴──────────────┬────────────────────┘
          │ (direct)                      │ (REST via Axios)
          ▼                               ▼
┌─────────────────────┐     ┌──────────────────────────────────┐
│   FIREBASE SERVICES  │     │     NESTJS API (Cloud Run)       │
│                      │     │                                  │
│  ┌────────────────┐  │     │  ┌────────────┐ ┌────────────┐  │
│  │ Firebase Auth   │  │     │  │ JiraModule │ │ TeamsModule│  │
│  │ (login/signup)  │  │     │  └────────────┘ └────────────┘  │
│  └────────────────┘  │     │  ┌────────────┐ ┌────────────┐  │
│  ┌────────────────┐  │     │  │ Confluence │ │Integration │  │
│  │ Cloud Firestore │  │     │  │ Module     │ │ Module     │  │
│  │ (data store)    │  │     │  └────────────┘ └────────────┘  │
│  └────────────────┘  │     │  ┌────────────┐ ┌────────────┐  │
│  ┌────────────────┐  │     │  │ ExcelModule│ │TicketModule│  │
│  │ Firebase Storage│  │     │  └────────────┘ └────────────┘  │
│  │ (file uploads)  │  │     │                                  │
│  └────────────────┘  │     │  Firebase Admin SDK (auth verify) │
│  ┌────────────────┐  │     │  Firestore Admin (read/write)     │
│  │ Cloud Functions │  │     └──────────────┬───────────────────┘
│  │ (triggers/cron) │  │                    │
│  └────────────────┘  │                    ▼
│  ┌────────────────┐  │     ┌──────────────────────────────────┐
│  │ Firebase Hosting│  │     │       EXTERNAL APIS               │
│  │ (SPA deploy)    │  │     │  ┌─────┐  ┌──────┐  ┌───────┐  │
│  └────────────────┘  │     │  │Jira │  │Conflu│  │Teams  │  │
└──────────────────────┘     │  │Cloud│  │ence  │  │Graph  │  │
                              │  └─────┘  └──────┘  └───────┘  │
                              └──────────────────────────────────┘
```

---

## 2. Project Structure

```
jira-automation/
├── client/                              # Frontend (React + Vite)
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── ui/                      # shadcn/ui components
│   │   │   ├── layout/                  # Sidebar, Header, Footer
│   │   │   ├── auth/                    # Login, Register forms
│   │   │   ├── setup/                   # Setup wizard steps
│   │   │   ├── excel/                   # Upload, Mapper, Preview
│   │   │   ├── teams/                   # Channel browser, Messages
│   │   │   ├── confluence/              # Report builder, Publisher
│   │   │   ├── dashboard/               # Metric cards, Charts
│   │   │   └── audit/                   # Log viewer, Filters
│   │   ├── hooks/                       # Custom React hooks
│   │   ├── lib/
│   │   │   ├── firebase.ts              # Firebase app init
│   │   │   ├── api.ts                   # Axios instance (NestJS)
│   │   │   └── utils.ts
│   │   ├── pages/
│   │   ├── store/                       # Zustand stores
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── package.json
│
├── server/                              # NestJS API (deploys to Cloud Run)
│   ├── src/
│   │   ├── common/
│   │   │   ├── guards/
│   │   │   │   └── firebase-auth.guard.ts   # Verify Firebase ID token
│   │   │   ├── decorators/
│   │   │   │   └── current-user.decorator.ts
│   │   │   ├── interceptors/
│   │   │   │   └── audit-log.interceptor.ts
│   │   │   └── filters/
│   │   │       └── http-exception.filter.ts
│   │   ├── modules/
│   │   │   ├── integration/             # Credential CRUD + encryption
│   │   │   │   ├── integration.controller.ts
│   │   │   │   ├── integration.service.ts
│   │   │   │   ├── integration.module.ts
│   │   │   │   └── dto/
│   │   │   ├── jira/                    # Jira REST API proxy
│   │   │   │   ├── jira.controller.ts
│   │   │   │   ├── jira.service.ts
│   │   │   │   └── jira.module.ts
│   │   │   ├── confluence/              # Confluence API proxy
│   │   │   │   ├── confluence.controller.ts
│   │   │   │   ├── confluence.service.ts
│   │   │   │   └── confluence.module.ts
│   │   │   ├── teams/                   # MS Graph API proxy
│   │   │   │   ├── teams.controller.ts
│   │   │   │   ├── teams.service.ts
│   │   │   │   └── teams.module.ts
│   │   │   ├── excel/                   # Parse, validate, map
│   │   │   │   ├── excel.controller.ts
│   │   │   │   ├── excel.service.ts
│   │   │   │   └── excel.module.ts
│   │   │   ├── tickets/                 # Bulk creation engine
│   │   │   │   ├── tickets.controller.ts
│   │   │   │   ├── tickets.service.ts
│   │   │   │   └── tickets.module.ts
│   │   │   ├── api-test/                # Phase 2: API Test Runner
│   │   │   │   ├── api-test.controller.ts
│   │   │   │   ├── api-test.service.ts
│   │   │   │   ├── api-test.module.ts
│   │   │   │   └── engines/
│   │   │   │       ├── request-executor.ts
│   │   │   │       ├── assertion-engine.ts
│   │   │   │       └── chain-resolver.ts
│   │   │   ├── bug-filing/              # Phase 2: Auto Bug Filing
│   │   │   │   ├── bug-filing.service.ts
│   │   │   │   ├── bug-filing.module.ts
│   │   │   │   └── duplicate-detector.ts
│   │   │   ├── web-test/                # Phase 3: Playwright Runner
│   │   │   │   ├── web-test.controller.ts
│   │   │   │   ├── web-test.service.ts
│   │   │   │   ├── web-test.module.ts
│   │   │   │   └── engines/
│   │   │   │       ├── playwright-runner.ts
│   │   │   │       └── visual-diff.ts
│   │   │   ├── mobile-test/             # Phase 4: Appium Runner
│   │   │   │   ├── mobile-test.controller.ts
│   │   │   │   ├── mobile-test.service.ts
│   │   │   │   ├── mobile-test.module.ts
│   │   │   │   └── engines/
│   │   │   │       ├── appium-client.ts
│   │   │   │       └── device-manager.ts
│   │   │   ├── security/                # Phase 5: Security Scanner
│   │   │   │   ├── security.controller.ts
│   │   │   │   ├── security.service.ts
│   │   │   │   ├── security.module.ts
│   │   │   │   └── scanners/
│   │   │   │       ├── owasp-zap.scanner.ts
│   │   │   │       ├── header-analyzer.ts
│   │   │   │       ├── ssl-checker.ts
│   │   │   │       └── port-scanner.ts
│   │   │   ├── performance/             # Phase 6: Load Testing
│   │   │   │   ├── performance.controller.ts
│   │   │   │   ├── performance.service.ts
│   │   │   │   ├── performance.module.ts
│   │   │   │   └── engines/
│   │   │   │       ├── k6-runner.ts
│   │   │   │       └── lighthouse-runner.ts
│   │   │   ├── test-data/               # Phase 7: Data Generator
│   │   │   │   ├── test-data.controller.ts
│   │   │   │   ├── test-data.service.ts
│   │   │   │   └── test-data.module.ts
│   │   │   ├── environment/             # Phase 7: Env Manager
│   │   │   │   ├── environment.controller.ts
│   │   │   │   ├── environment.service.ts
│   │   │   │   └── environment.module.ts
│   │   │   ├── notifications/           # Phase 8: Alerting Hub
│   │   │   │   ├── notifications.controller.ts
│   │   │   │   ├── notifications.service.ts
│   │   │   │   └── notifications.module.ts
│   │   │   ├── cicd/                    # Phase 9: CI/CD Integration
│   │   │   │   ├── cicd.controller.ts
│   │   │   │   ├── cicd.service.ts
│   │   │   │   └── cicd.module.ts
│   │   │   ├── accessibility/           # Phase 10: a11y Testing
│   │   │   │   ├── a11y.controller.ts
│   │   │   │   ├── a11y.service.ts
│   │   │   │   └── a11y.module.ts
│   │   │   ├── log-analyzer/            # Phase 10: Log Analysis
│   │   │   │   ├── log-analyzer.controller.ts
│   │   │   │   ├── log-analyzer.service.ts
│   │   │   │   └── log-analyzer.module.ts
│   │   │   ├── ai/                      # Phase 11: AI Intelligence Engine
│   │   │   │   ├── ai.controller.ts
│   │   │   │   ├── ai.service.ts
│   │   │   │   ├── ai.module.ts
│   │   │   │   └── generators/
│   │   │   │       ├── test-case.generator.ts
│   │   │   │       ├── playwright-script.generator.ts
│   │   │   │       ├── appium-script.generator.ts
│   │   │   │       ├── api-script.generator.ts
│   │   │   │       ├── release-notes.generator.ts
│   │   │   │       └── gherkin.generator.ts
│   │   │   ├── contract/                # Phase 12: Pact Contract Testing
│   │   │   │   ├── contract.controller.ts
│   │   │   │   ├── contract.service.ts
│   │   │   │   └── contract.module.ts
│   │   │   ├── chaos/                   # Phase 13: Chaos Engineering
│   │   │   │   ├── chaos.controller.ts
│   │   │   │   ├── chaos.service.ts
│   │   │   │   ├── chaos.module.ts
│   │   │   │   └── injectors/
│   │   │   │       ├── latency.injector.ts
│   │   │   │       ├── error.injector.ts
│   │   │   │       └── resource.injector.ts
│   │   │   ├── db-test/                 # Phase 14: Database Testing
│   │   │   │   ├── db-test.controller.ts
│   │   │   │   ├── db-test.service.ts
│   │   │   │   ├── db-test.module.ts
│   │   │   │   └── connectors/
│   │   │   │       ├── postgres.connector.ts
│   │   │   │       ├── mysql.connector.ts
│   │   │   │       └── mongo.connector.ts
│   │   │   ├── snapshot/                # Phase 14: Snapshot Testing
│   │   │   │   ├── snapshot.controller.ts
│   │   │   │   ├── snapshot.service.ts
│   │   │   │   └── snapshot.module.ts
│   │   │   ├── flake-analyzer/          # Phase 15: Flake Detection
│   │   │   │   ├── flake.controller.ts
│   │   │   │   ├── flake.service.ts
│   │   │   │   └── flake.module.ts
│   │   │   ├── multi-region/            # Phase 15: Multi-Region
│   │   │   │   ├── region.controller.ts
│   │   │   │   ├── region.service.ts
│   │   │   │   └── region.module.ts
│   │   │   ├── coverage/                # Phase 16: Coverage Mapper
│   │   │   │   ├── coverage.controller.ts
│   │   │   │   ├── coverage.service.ts
│   │   │   │   └── coverage.module.ts
│   │   │   ├── release-gate/            # Phase 16: Release Readiness
│   │   │   │   ├── release-gate.controller.ts
│   │   │   │   ├── release-gate.service.ts
│   │   │   │   └── release-gate.module.ts
│   │   │   ├── scheduler/              # Addon: Test Scheduling
│   │   │   │   ├── scheduler.controller.ts
│   │   │   │   ├── scheduler.service.ts
│   │   │   │   └── scheduler.module.ts
│   │   │   ├── team/                   # Addon: Team Management
│   │   │   │   ├── team.controller.ts
│   │   │   │   ├── team.service.ts
│   │   │   │   └── team.module.ts
│   │   │   ├── project/                # Addon: Multi-Project Support
│   │   │   │   ├── project.controller.ts
│   │   │   │   ├── project.service.ts
│   │   │   │   └── project.module.ts
│   │   │   └── webhooks/               # Addon: Webhook Management
│   │   │       ├── webhooks.controller.ts
│   │   │       ├── webhooks.service.ts
│   │   │       └── webhooks.module.ts
│   │   ├── config/
│   │   │   ├── firebase-admin.config.ts # Firebase Admin SDK init
│   │   │   └── app.config.ts
│   │   ├── utils/
│   │   │   └── encryption.util.ts       # AES-256-GCM helpers
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── Dockerfile                       # Cloud Run deployment
│   ├── tsconfig.json
│   ├── nest-cli.json
│   └── package.json
│
├── functions/                           # Firebase Cloud Functions
│   ├── src/
│   │   ├── index.ts                     # Function exports
│   │   ├── onFileUpload.ts             # Storage trigger → parse Excel
│   │   ├── onTicketWrite.ts            # Firestore trigger → update batch stats
│   │   ├── onUserCreate.ts             # Auth trigger → init user profile
│   │   └── scheduledReport.ts          # Cron → auto-publish to Confluence
│   ├── tsconfig.json
│   └── package.json
│
├── firebase.json                        # Firebase project config
├── firestore.rules                      # Security rules
├── firestore.indexes.json               # Composite indexes
├── storage.rules                        # Storage security rules
├── .firebaserc                          # Project aliases
├── .env.example
├── .gitignore
├── REQUIREMENTS.md
├── USER-STORIES.md
├── IMPLEMENTATION.md
└── README.md
```

---

## 3. Firestore Data Model

```
Firestore Collections
=====================

users/{uid}
├── email: string
├── fullName: string
├── role: "ADMIN" | "MANAGER" | "USER"
├── isActive: boolean
├── setupComplete: boolean
├── createdAt: timestamp
├── updatedAt: timestamp
│
├── /integrations/{type}                 # subcollection
│   ├── type: "JIRA" | "CONFLUENCE" | "TEAMS"
│   ├── encryptedConfig: string          # AES-256 encrypted JSON
│   ├── isActive: boolean
│   ├── lastTestedAt: timestamp | null
│   ├── lastTestStatus: boolean | null
│   └── updatedAt: timestamp
│
└── /mappingTemplates/{templateId}       # subcollection
    ├── name: string
    ├── mappings: map                    # { excelColumn: jiraField }
    ├── createdAt: timestamp
    └── updatedAt: timestamp

ticketBatches/{batchId}
├── userId: string
├── source: "EXCEL" | "TEAMS"
├── totalCount: number
├── successCount: number
├── failedCount: number
├── status: "PENDING" | "PROCESSING" | "COMPLETED" | "PARTIAL_FAILURE" | "FAILED"
├── createdAt: timestamp
│
└── /tickets/{ticketId}                  # subcollection
    ├── jiraKey: string | null
    ├── jiraId: string | null
    ├── summary: string
    ├── description: string | null
    ├── issueType: string
    ├── priority: string | null
    ├── assignee: string | null
    ├── labels: array<string>
    ├── status: "PENDING" | "CREATING" | "CREATED" | "FAILED"
    ├── errorMsg: string | null
    ├── sourceData: map                  # Original row/message
    └── createdAt: timestamp

auditLogs/{logId}
├── userId: string
├── action: string                       # "TICKET_CREATED", "EXCEL_UPLOADED", etc.
├── details: map | null
├── status: "SUCCESS" | "FAILURE"
└── createdAt: timestamp

# ─── Phase 2: Test Case Management ───

testSuites/{suiteId}
├── userId: string
├── name: string
├── parentId: string | null              # For nested folders
├── tags: array<string>
├── createdAt: timestamp
├── updatedAt: timestamp
│
└── /testCases/{caseId}                  # subcollection
    ├── title: string
    ├── preconditions: string | null
    ├── steps: array<{ step: string, expected: string }>
    ├── priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
    ├── type: "SMOKE" | "REGRESSION" | "SANITY" | "EXPLORATORY"
    ├── tags: array<string>
    ├── linkedJiraKeys: array<string>
    ├── version: number
    ├── createdAt: timestamp
    └── updatedAt: timestamp

testRuns/{runId}
├── userId: string
├── name: string
├── assignedTo: string                   # UID of assigned QA
├── suiteId: string
├── totalCases: number
├── passed: number
├── failed: number
├── blocked: number
├── skipped: number
├── status: "PENDING" | "IN_PROGRESS" | "COMPLETED"
├── linkedSprint: string | null
├── createdAt: timestamp
│
└── /results/{resultId}                  # subcollection
    ├── testCaseId: string
    ├── status: "PASS" | "FAIL" | "BLOCKED" | "SKIPPED"
    ├── notes: string | null
    ├── bugJiraKey: string | null         # Auto-filed bug
    ├── executedAt: timestamp

# ─── Phase 2: API Test Runner ───

apiCollections/{collectionId}
├── userId: string
├── name: string
├── description: string | null
├── environmentId: string | null
├── createdAt: timestamp
│
├── /requests/{requestId}                # subcollection
│   ├── name: string
│   ├── folderId: string | null
│   ├── method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
│   ├── url: string
│   ├── headers: map
│   ├── body: string | null
│   ├── bodyType: "JSON" | "FORM" | "RAW" | "GRAPHQL"
│   ├── auth: map | null
│   ├── queryParams: map
│   ├── assertions: array<{ type, path, operator, value }>
│   ├── chainFrom: map | null            # { requestId, jsonPath, variableName }
│   ├── sortOrder: number
│   └── createdAt: timestamp
│
└── /runs/{runId}                        # subcollection
    ├── status: "RUNNING" | "PASSED" | "FAILED"
    ├── totalRequests: number
    ├── passed: number
    ├── failed: number
    ├── avgResponseTime: number
    ├── environmentId: string
    ├── triggeredBy: "MANUAL" | "CI/CD" | "SCHEDULED"
    ├── createdAt: timestamp
    │
    └── /results/{resultId}
        ├── requestId: string
        ├── status: "PASS" | "FAIL"
        ├── responseCode: number
        ├── responseTime: number
        ├── responseBody: string
        ├── responseHeaders: map
        ├── assertions: array<{ passed, message }>
        ├── errorMsg: string | null
        └── bugJiraKey: string | null

# ─── Phase 3-4: Web & Mobile Test Runs ───

testExecutions/{executionId}
├── userId: string
├── type: "WEB_PLAYWRIGHT" | "MOBILE_APPIUM" | "SECURITY" | "PERFORMANCE" | "ACCESSIBILITY"
├── name: string
├── targetUrl: string
├── status: "RUNNING" | "PASSED" | "FAILED" | "ERROR"
├── config: map                          # Browser, device, capabilities, etc.
├── totalTests: number
├── passed: number
├── failed: number
├── duration: number                     # ms
├── triggeredBy: "MANUAL" | "CI/CD" | "SCHEDULED"
├── createdAt: timestamp
│
└── /results/{resultId}
    ├── testName: string
    ├── status: "PASS" | "FAIL" | "ERROR"
    ├── errorMsg: string | null
    ├── screenshotUrl: string | null      # Firebase Storage
    ├── videoUrl: string | null
    ├── logOutput: string | null
    ├── duration: number
    ├── bugJiraKey: string | null
    └── metadata: map                    # Device info, browser, viewport, etc.

# ─── Phase 5: Security Scan Results ───

securityScans/{scanId}
├── userId: string
├── targetUrl: string
├── scanType: "FULL" | "HEADERS" | "SSL" | "PORTS"
├── status: "RUNNING" | "COMPLETED" | "FAILED"
├── summary: map                         # { critical, high, medium, low }
├── createdAt: timestamp
│
└── /findings/{findingId}
    ├── severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
    ├── category: string                 # "SQL_INJECTION", "XSS", "CSRF", etc.
    ├── description: string
    ├── location: string                 # URL/param affected
    ├── evidence: string | null
    ├── remediation: string
    ├── bugJiraKey: string | null
    └── status: "OPEN" | "FIXED" | "ACCEPTED"

# ─── Phase 6: Performance Results ───

performanceRuns/{runId}
├── userId: string
├── targetUrl: string
├── type: "LOAD" | "STRESS" | "SPIKE" | "SOAK" | "LIGHTHOUSE"
├── config: map                          # { vus, duration, rampUp, thresholds }
├── status: "RUNNING" | "PASSED" | "FAILED"
├── results: map                         # { avgResponseTime, p95, p99, throughput, errorRate }
├── lighthouseScores: map | null         # { performance, accessibility, seo, bestPractices }
├── createdAt: timestamp

# ─── Phase 7: Environments ───

environments/{envId}
├── userId: string
├── name: string                         # "Development", "Staging", "Production"
├── baseUrl: string
├── variables: map                       # Key-value pairs
├── healthStatus: "UP" | "DOWN" | "DEGRADED"
├── lastCheckedAt: timestamp
├── currentBuild: string | null
├── accessLevel: "ALL" | "LEADS" | "ADMINS"
├── createdAt: timestamp

# ─── Phase 8: Notifications ───

notifications/{notifId}
├── userId: string
├── type: "TEST_FAILURE" | "BUG_FILED" | "SECURITY_VULN" | "BUILD_DEPLOYED" | "ESCALATION"
├── title: string
├── message: string
├── isRead: boolean
├── sourceType: string                   # "API_TEST", "WEB_TEST", "SECURITY", etc.
├── sourceId: string
├── createdAt: timestamp

# ─── Phase 11: AI Intelligence Engine ───

aiGenerations/{genId}
├── userId: string
├── type: "TEST_CASE" | "PLAYWRIGHT_SCRIPT" | "APPIUM_SCRIPT" | "API_SCRIPT" | "RELEASE_NOTES" | "GHERKIN"
├── input: map                           # Source data (Jira story, URL, spec, etc.)
├── output: string                       # Generated content
├── model: string                        # "claude-sonnet-4-6" | "gpt-4o" etc.
├── language: string | null              # "javascript" | "typescript" | "python" | "java"
├── status: "GENERATING" | "COMPLETED" | "FAILED"
├── savedToModule: string | null         # "TEST_CASES" | "API_RUNNER" | "WEB_RUNNER" | "MOBILE_RUNNER"
├── savedId: string | null               # ID in target module
├── createdAt: timestamp

releaseNotes/{noteId}
├── userId: string
├── title: string                        # "v2.1.0 Release Notes"
├── jiraSource: map                      # { sprintId, versionId, dateRange }
├── categories: map                      # { features: [], improvements: [], bugFixes: [], breaking: [], known: [] }
├── content: map                         # { markdown: string, html: string }
├── template: string                     # Template ID used
├── publishedTo: array<string>           # ["CONFLUENCE", "SLACK", "GITHUB"]
├── status: "DRAFT" | "PUBLISHED"
├── createdAt: timestamp

# ─── Phase 12: Contract Testing ───

contracts/{contractId}
├── userId: string
├── name: string
├── consumer: string                     # Service name
├── provider: string                     # Service name
├── version: string
├── contract: map                        # Pact contract JSON
├── verificationStatus: "PENDING" | "VERIFIED" | "FAILED"
├── breakingChanges: array<map>
├── lastVerifiedAt: timestamp
├── createdAt: timestamp

# ─── Phase 13: Chaos Engineering ───

chaosExperiments/{expId}
├── userId: string
├── name: string
├── targetUrl: string
├── faultType: "LATENCY" | "HTTP_ERROR" | "CPU_STRESS" | "MEMORY_STRESS" | "DEPENDENCY_FAILURE"
├── config: map                          # { duration, intensity, scope }
├── blastRadius: map                     # { maxRequests, targetPaths }
├── status: "SCHEDULED" | "RUNNING" | "COMPLETED" | "ABORTED"
├── results: map                         # { recoveryTime, errorsDuring, systemBehavior }
├── recoveryValidated: boolean
├── createdAt: timestamp

# ─── Phase 14: Database Testing + Snapshots ───

dbConnections/{connId}
├── userId: string
├── name: string
├── type: "POSTGRES" | "MYSQL" | "MONGODB" | "FIRESTORE"
├── encryptedConfig: string              # AES-256 encrypted connection string
├── lastTestedAt: timestamp
├── createdAt: timestamp

dbTestRuns/{runId}
├── userId: string
├── connectionId: string
├── queries: array<{ sql, expectedResult, actualResult, passed }>
├── integrityChecks: array<{ check, passed, details }>
├── status: "PASSED" | "FAILED"
├── createdAt: timestamp

snapshots/{snapshotId}
├── userId: string
├── name: string
├── type: "API_RESPONSE" | "UI_COMPONENT" | "DB_SCHEMA"
├── baseline: map                        # The baseline snapshot
├── current: map | null                  # Latest comparison
├── diffResult: map | null               # { changed, added, removed }
├── status: "BASELINE" | "MATCHED" | "CHANGED"
├── buildRef: string | null
├── createdAt: timestamp

# ─── Phase 15: Flake Analyzer + Multi-Region ───

flakeRecords/{testId}
├── testName: string
├── testType: "API" | "WEB" | "MOBILE" | "SECURITY"
├── history: array<{ runId, status, timestamp }>  # Last 50 runs
├── flakeScore: number                   # 0-100 (flip frequency %)
├── isQuarantined: boolean
├── lastFlakeAt: timestamp
├── rootCauseSuggestion: string | null
├── updatedAt: timestamp

regionTestRuns/{runId}
├── userId: string
├── testExecutionId: string
├── regions: array<string>               # ["us-central1", "europe-west1", "asia-east1"]
├── results: map                         # { region: { latency, status, errors } }
├── cdnValidation: map | null
├── createdAt: timestamp

# ─── Phase 16: Compliance + Coverage + Release Gate ───

complianceChecklists/{checklistId}
├── userId: string
├── standard: "SOC2" | "GDPR" | "HIPAA" | "PCI_DSS"
├── items: array<{ requirement, status, evidence, linkedTestIds }>
├── score: number                        # Percentage complete
├── lastAuditedAt: timestamp
├── createdAt: timestamp

coverageReports/{reportId}
├── userId: string
├── source: "ISTANBUL" | "NYC" | "JACOCO"
├── buildRef: string
├── summary: map                         # { lines, branches, functions, statements }
├── uncoveredPaths: array<string>
├── linkedTestCases: map                 # { path: [testCaseIds] }
├── createdAt: timestamp

releaseGates/{gateId}
├── userId: string
├── releaseName: string
├── criteria: map                        # { minTestPass, minCoverage, maxCriticalVulns, maxP95Latency }
├── signals: map                         # { testPassRate, coverage, secVulns, perfP95, flakeCount }
├── verdict: "PASS" | "FAIL" | "PENDING"
├── approvals: array<{ userId, role, approved, timestamp }>
├── releaseNotesId: string | null        # Auto-generated
├── createdAt: timestamp

# ─── Platform Addons ───

schedules/{scheduleId}
├── userId: string
├── projectId: string | null
├── name: string
├── type: "API" | "WEB" | "SECURITY" | "ACCESSIBILITY"
├── targetId: string                     # Collection ID or test ID to run
├── cronExpression: string               # "0 9 * * 1-5"
├── isEnabled: boolean
├── lastRunAt: timestamp | null
├── nextRunAt: timestamp | null
├── createdAt: timestamp
│
└── /history/{historyId}                 # subcollection
    ├── status: "RUNNING" | "PASSED" | "FAILED" | "ERROR"
    ├── duration: number                 # ms
    ├── executionId: string              # Link to test execution
    ├── triggeredAt: timestamp

teams/{teamId}
├── name: string
├── ownerId: string                      # Creator/admin UID
├── settings: map                        # { timezone, defaultProject, notifications }
├── createdAt: timestamp
│
└── /members/{uid}                       # subcollection
    ├── email: string
    ├── role: "ADMIN" | "MANAGER" | "USER"
    ├── status: "ACTIVE" | "PENDING" | "INACTIVE"
    ├── invitedAt: timestamp
    ├── joinedAt: timestamp | null

projects/{projectId}
├── teamId: string
├── name: string
├── description: string | null
├── jiraConfig: map | null               # Per-project Jira settings
├── isDefault: boolean
├── createdBy: string
├── createdAt: timestamp
├── updatedAt: timestamp

webhooks/{webhookId}
├── userId: string
├── projectId: string | null
├── direction: "INCOMING" | "OUTGOING"
├── name: string
├── url: string                          # Endpoint URL
├── events: array<string>               # ["TEST_FAILURE", "SCAN_COMPLETE", "GATE_EVALUATED"]
├── headers: map | null
├── secret: string | null                # HMAC signing secret
├── isActive: boolean
├── createdAt: timestamp
│
└── /deliveries/{deliveryId}             # subcollection
    ├── event: string
    ├── payload: map
    ├── statusCode: number | null
    ├── responseTime: number | null
    ├── status: "SUCCESS" | "FAILED" | "PENDING"
    ├── sentAt: timestamp

apiMetrics/{metricId}
├── userId: string
├── endpoint: string
├── method: string
├── statusCode: number
├── responseTime: number                 # ms
├── timestamp: timestamp

maskingRules/{ruleId}
├── userId: string
├── projectId: string | null
├── name: string
├── fieldPattern: string                 # Regex pattern for field names
├── dataPattern: string | null           # Regex pattern for values
├── maskType: "FULL" | "PARTIAL" | "HASH" | "REDACT"
├── isActive: boolean
├── createdAt: timestamp

dashboardLayouts/{layoutId}
├── userId: string
├── name: string
├── isDefault: boolean
├── widgets: array<{ id, type, dataSource, position, size, config }>
├── createdAt: timestamp
├── updatedAt: timestamp
```

---

## 4. API Endpoints (NestJS on Cloud Run)

**Base URL:** `https://api-{project}.run.app/api/v1`
**Auth:** Every request must include `Authorization: Bearer {Firebase ID Token}`

### Integration Setup
| Method | Endpoint                        | Description                | Role  |
|--------|---------------------------------|----------------------------|-------|
| GET    | /integrations                   | List user integrations     | Any   |
| POST   | /integrations/:type             | Save integration config    | Admin |
| PUT    | /integrations/:type             | Update integration config  | Admin |
| POST   | /integrations/:type/test        | Test connection            | Admin |
| GET    | /integrations/health            | Health check all           | Any   |

### Jira Proxy
| Method | Endpoint                    | Description             | Role |
|--------|-----------------------------|-------------------------|------|
| GET    | /jira/projects              | List Jira projects      | Any  |
| GET    | /jira/issue-types/:project  | List issue types        | Any  |
| GET    | /jira/priorities            | List priorities         | Any  |
| GET    | /jira/users?query=          | Search assignees        | Any  |
| GET    | /jira/fields/:project       | List available fields   | Any  |

### Excel Processing
| Method | Endpoint                    | Description             | Role |
|--------|-----------------------------|-------------------------|------|
| POST   | /excel/parse                | Parse uploaded file URL  | Any  |
| POST   | /excel/validate             | Validate mapped data    | Any  |
| POST   | /excel/create-tickets       | Bulk create tickets     | Any  |

### Teams Proxy
| Method | Endpoint                                   | Description        | Role |
|--------|--------------------------------------------|--------------------|------|
| GET    | /teams/joined                              | List joined teams  | Any  |
| GET    | /teams/:teamId/channels                    | List channels      | Any  |
| GET    | /teams/:teamId/channels/:channelId/messages| Fetch messages     | Any  |

### Confluence Proxy
| Method | Endpoint                    | Description             | Role |
|--------|-----------------------------|-------------------------|------|
| GET    | /confluence/spaces          | List spaces             | Any  |
| GET    | /confluence/pages           | Search pages            | Any  |
| POST   | /confluence/publish         | Publish report          | Any  |

### Tickets
| Method | Endpoint                    | Description             | Role |
|--------|-----------------------------|-------------------------|------|
| POST   | /tickets/retry/:batchId     | Retry failed tickets    | Any  |

### API Test Runner (Phase 2)
| Method | Endpoint                              | Description                    | Role |
|--------|---------------------------------------|--------------------------------|------|
| POST   | /api-test/execute/:requestId          | Execute single API request     | Any  |
| POST   | /api-test/run/:collectionId           | Run entire collection          | Any  |
| POST   | /api-test/import/postman              | Import Postman collection      | Any  |
| POST   | /api-test/import/openapi              | Import from Swagger/OpenAPI    | Any  |

### Auto Bug Filing (Phase 2)
| Method | Endpoint                              | Description                    | Role |
|--------|---------------------------------------|--------------------------------|------|
| POST   | /bugs/auto-file                       | Auto-create Jira bug           | Any  |
| GET    | /bugs/duplicates?summary=             | Check for duplicate bugs       | Any  |

### Web Test Runner (Phase 3)
| Method | Endpoint                              | Description                    | Role |
|--------|---------------------------------------|--------------------------------|------|
| POST   | /web-test/run                         | Execute Playwright test script | Any  |
| POST   | /web-test/visual-diff                 | Run visual regression compare  | Any  |
| POST   | /web-test/record                      | Start no-code recording (P2)   | Any  |

### Mobile Test Runner (Phase 4)
| Method | Endpoint                              | Description                    | Role |
|--------|---------------------------------------|--------------------------------|------|
| GET    | /mobile-test/devices                  | List connected devices         | Any  |
| POST   | /mobile-test/run                      | Execute Appium test script     | Any  |
| POST   | /mobile-test/capabilities             | Validate desired capabilities  | Any  |

### Security Scanner (Phase 5)
| Method | Endpoint                              | Description                    | Role |
|--------|---------------------------------------|--------------------------------|------|
| POST   | /security/scan                        | Start OWASP scan               | Any  |
| POST   | /security/headers                     | Analyze HTTP security headers  | Any  |
| POST   | /security/ssl                         | Check SSL/TLS configuration    | Any  |
| POST   | /security/ports                       | Scan common ports              | Any  |
| GET    | /security/scan/:scanId                | Get scan results               | Any  |

### Performance Testing (Phase 6)
| Method | Endpoint                              | Description                    | Role |
|--------|---------------------------------------|--------------------------------|------|
| POST   | /performance/load                     | Start k6 load test             | Any  |
| POST   | /performance/lighthouse               | Run Lighthouse audit           | Any  |
| GET    | /performance/run/:runId               | Get performance results        | Any  |

### Test Data Generator (Phase 7)
| Method | Endpoint                              | Description                    | Role |
|--------|---------------------------------------|--------------------------------|------|
| POST   | /test-data/generate                   | Generate fake data from schema | Any  |
| POST   | /test-data/seed                       | POST generated data to target  | Any  |
| GET    | /test-data/presets                    | List available data presets    | Any  |

### Environment Manager (Phase 7)
| Method | Endpoint                              | Description                    | Role  |
|--------|---------------------------------------|--------------------------------|-------|
| POST   | /environments/:envId/health           | Check environment health       | Any   |
| POST   | /environments/diff                    | Compare two environments       | Any   |

### CI/CD Integration (Phase 9)
| Method | Endpoint                              | Description                    | Role |
|--------|---------------------------------------|--------------------------------|------|
| POST   | /cicd/trigger                         | Trigger test run from CI       | Any  |
| POST   | /cicd/webhook                         | Receive CI/CD webhook events   | Any  |
| GET    | /cicd/gate/:runId                     | Quality gate check (pass/fail) | Any  |
| POST   | /cicd/pr-comment                      | Post results to PR             | Any  |

### Accessibility Testing (Phase 10)
| Method | Endpoint                              | Description                    | Role |
|--------|---------------------------------------|--------------------------------|------|
| POST   | /accessibility/scan                   | Run axe-core WCAG scan         | Any  |
| POST   | /accessibility/contrast               | Check color contrast           | Any  |

### Log Analyzer (Phase 10)
| Method | Endpoint                              | Description                    | Role |
|--------|---------------------------------------|--------------------------------|------|
| POST   | /logs/connect                         | Connect to log source          | Admin|
| POST   | /logs/search                          | Search and filter logs         | Any  |
| GET    | /logs/errors/grouped                  | Get grouped error patterns     | Any  |

### AI Intelligence Engine (Phase 11)
| Method | Endpoint                              | Description                    | Role |
|--------|---------------------------------------|--------------------------------|------|
| POST   | /ai/generate/test-cases               | Generate test cases from Jira story or API spec | Any |
| POST   | /ai/generate/playwright-script        | Generate Playwright test script | Any |
| POST   | /ai/generate/appium-script            | Generate Appium/WDIO script    | Any |
| POST   | /ai/generate/api-script               | Generate API test script       | Any |
| POST   | /ai/generate/release-notes            | Generate release notes from Jira | Any |
| POST   | /ai/generate/gherkin                  | Generate BDD feature files     | Any |
| POST   | /ai/refine                            | Improve existing test cases    | Any |
| POST   | /ai/suggest-missing                   | Suggest missing test scenarios | Any |
| PUT    | /ai/regenerate/:genId                 | Regenerate with different params | Any |

### Contract Testing — Pact (Phase 12)
| Method | Endpoint                              | Description                    | Role |
|--------|---------------------------------------|--------------------------------|------|
| POST   | /contracts                            | Define consumer contract       | Any  |
| POST   | /contracts/:id/verify                 | Verify provider compliance     | Any  |
| GET    | /contracts/:id/diff                   | Get contract diff              | Any  |

### Chaos Engineering (Phase 13)
| Method | Endpoint                              | Description                    | Role  |
|--------|---------------------------------------|--------------------------------|-------|
| POST   | /chaos/experiments                    | Create chaos experiment        | Admin |
| POST   | /chaos/experiments/:id/run            | Start experiment               | Admin |
| POST   | /chaos/experiments/:id/abort          | Abort running experiment       | Admin |
| GET    | /chaos/experiments/:id/results        | Get experiment results         | Any   |

### Database Testing (Phase 14)
| Method | Endpoint                              | Description                    | Role |
|--------|---------------------------------------|--------------------------------|------|
| POST   | /db-test/connect                      | Test DB connection             | Any  |
| POST   | /db-test/execute                      | Execute SQL/query + validate   | Any  |
| POST   | /db-test/integrity                    | Run integrity checks           | Any  |
| POST   | /db-test/schema-diff                  | Compare schemas across envs    | Any  |

### Snapshot Testing (Phase 14)
| Method | Endpoint                              | Description                    | Role |
|--------|---------------------------------------|--------------------------------|------|
| POST   | /snapshots/capture                    | Capture new snapshot           | Any  |
| POST   | /snapshots/:id/compare                | Compare against baseline       | Any  |
| PUT    | /snapshots/:id/accept                 | Accept current as new baseline | Any  |

### Flake Analyzer (Phase 15)
| Method | Endpoint                              | Description                    | Role |
|--------|---------------------------------------|--------------------------------|------|
| GET    | /flakes                               | List flaky tests with scores   | Any  |
| POST   | /flakes/:testId/quarantine            | Quarantine a flaky test        | Any  |
| POST   | /flakes/:testId/unquarantine          | Restore quarantined test       | Any  |

### Multi-Region Testing (Phase 15)
| Method | Endpoint                              | Description                    | Role |
|--------|---------------------------------------|--------------------------------|------|
| POST   | /regions/execute                      | Run test across regions        | Any  |
| GET    | /regions/results/:runId               | Get multi-region results       | Any  |

### Coverage Mapper (Phase 16)
| Method | Endpoint                              | Description                    | Role |
|--------|---------------------------------------|--------------------------------|------|
| POST   | /coverage/import                      | Import coverage report         | Any  |
| POST   | /coverage/map                         | Map coverage to test cases     | Any  |
| GET    | /coverage/gaps                        | Get uncovered code paths       | Any  |

### Release Readiness Gate (Phase 16)
| Method | Endpoint                              | Description                    | Role |
|--------|---------------------------------------|--------------------------------|------|
| POST   | /release-gate/evaluate                | Evaluate release readiness     | Any  |
| POST   | /release-gate/:id/approve             | Sign-off on release            | Lead |
| GET    | /release-gate/:id/scorecard           | Get readiness scorecard        | Any  |

### Test Scheduling (Addon)
| Method | Endpoint                              | Description                    | Role |
|--------|---------------------------------------|--------------------------------|------|
| POST   | /schedules                            | Create a test schedule         | Any  |
| PUT    | /schedules/:id                        | Update schedule config         | Any  |
| DELETE | /schedules/:id                        | Delete a schedule              | Any  |
| POST   | /schedules/:id/run                    | Manual "Run Now" trigger       | Any  |
| GET    | /schedules/:id/history                | Get execution history          | Any  |

### Team Management (Addon)
| Method | Endpoint                              | Description                    | Role  |
|--------|---------------------------------------|--------------------------------|-------|
| POST   | /teams                                | Create a team                  | Admin |
| GET    | /teams/:id/members                    | List team members              | Any   |
| POST   | /teams/:id/invite                     | Invite member via email        | Admin |
| PUT    | /teams/:id/members/:uid/role          | Update member role             | Admin |
| DELETE | /teams/:id/members/:uid               | Remove team member             | Admin |
| PUT    | /teams/:id/settings                   | Update team settings           | Admin |

### Multi-Project Support (Addon)
| Method | Endpoint                              | Description                    | Role  |
|--------|---------------------------------------|--------------------------------|-------|
| POST   | /projects                             | Create a project               | Admin |
| GET    | /projects                             | List all projects              | Any   |
| PUT    | /projects/:id                         | Update project settings        | Admin |
| DELETE | /projects/:id                         | Delete project (admin only)    | Admin |
| PUT    | /projects/:id/jira-config             | Set per-project Jira config    | Admin |

### Webhook Management (Addon)
| Method | Endpoint                              | Description                    | Role  |
|--------|---------------------------------------|--------------------------------|-------|
| POST   | /webhooks                             | Create a webhook               | Admin |
| GET    | /webhooks                             | List all webhooks              | Any   |
| PUT    | /webhooks/:id                         | Update webhook config          | Admin |
| DELETE | /webhooks/:id                         | Delete a webhook               | Admin |
| POST   | /webhooks/:id/test                    | Send test payload              | Admin |
| GET    | /webhooks/:id/deliveries              | Get delivery history           | Any   |
| POST   | /webhooks/incoming/:token             | Receive incoming webhook       | Any   |

### API Usage Analytics (Addon)
| Method | Endpoint                              | Description                    | Role  |
|--------|---------------------------------------|--------------------------------|-------|
| GET    | /api-metrics/summary                  | Get API usage summary          | Admin |
| GET    | /api-metrics/endpoints                | Per-endpoint breakdown         | Admin |
| GET    | /api-metrics/timeseries               | Volume and latency over time   | Admin |

### Data Masking (Addon)
| Method | Endpoint                              | Description                    | Role |
|--------|---------------------------------------|--------------------------------|------|
| POST   | /masking/rules                        | Create masking rule            | Any  |
| GET    | /masking/rules                        | List masking rules             | Any  |
| PUT    | /masking/rules/:id                    | Update masking rule            | Any  |
| DELETE | /masking/rules/:id                    | Delete masking rule            | Any  |
| POST   | /masking/preview                      | Preview masked output          | Any  |

**Note:** Auth endpoints (login, register, password reset) are NOT in NestJS — they use Firebase Auth SDK directly from the frontend.

**Note:** Dashboard stats, audit log reads, test case CRUD, test run tracking, notifications, compliance checklists, and flake records are direct Firestore reads/writes from the frontend — no NestJS endpoint needed.

---

## 5. Firebase Cloud Functions

| Function              | Trigger                          | Phase | Purpose                                |
|-----------------------|----------------------------------|-------|----------------------------------------|
| `onUserCreate`        | `auth.user().onCreate`           | 1     | Create user profile doc in Firestore   |
| `onFileUpload`        | `storage.object().onFinalize`    | 1     | Parse Excel, store parsed data in Firestore |
| `onTicketWrite`       | `firestore.onWrite('ticketBatches/{id}/tickets/{tid}')` | 1 | Update batch success/fail counts |
| `scheduledReport`     | `pubsub.schedule('every monday 09:00')` | 1 | Auto-generate and publish Confluence report |
| `onTestResultWrite`   | `firestore.onWrite('testExecutions/{id}/results/{rid}')` | 2 | Update execution pass/fail counts |
| `onBugFiled`          | `firestore.onCreate('auditLogs/{id}')` [action=BUG_FILED] | 2 | Trigger notification on auto-filed bug |
| `scheduledApiTests`   | `pubsub.schedule` (user-configurable) | 2 | Run scheduled API test collections |
| `scheduledSecScan`    | `pubsub.schedule` (user-configurable) | 5 | Run recurring security scans |
| `envHealthCheck`      | `pubsub.schedule('every 5 minutes')` | 7 | Ping registered environments, update health status |
| `onNotificationCreate`| `firestore.onCreate('notifications/{id}')` | 8 | Dispatch to Slack/Teams/Email/Webhook |
| `onTestFailEscalation`| `pubsub.schedule('every 1 hour')` | 8 | Check unassigned critical bugs → escalate |
| `onAIGenComplete`     | `firestore.onUpdate('aiGenerations/{id}')` | 11 | Notify user when AI generation completes |
| `onContractVerify`    | `firestore.onUpdate('contracts/{id}')` | 12 | Alert on breaking contract changes |
| `scheduledChaos`      | `pubsub.schedule` (user-configurable) | 13 | Run scheduled chaos experiments |
| `onFlakeDetected`     | `firestore.onUpdate('flakeRecords/{id}')` | 15 | Alert when flake score exceeds threshold |
| `onReleaseGateEval`   | `firestore.onUpdate('releaseGates/{id}')` | 16 | Notify stakeholders on gate pass/fail |

---

## 6. Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only read/write their own profile
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;

      match /integrations/{type} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
      match /mappingTemplates/{templateId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }

    // Ticket batches — owner access only
    match /ticketBatches/{batchId} {
      allow read: if request.auth != null
        && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
      allow update: if request.auth != null
        && resource.data.userId == request.auth.uid;

      match /tickets/{ticketId} {
        allow read, write: if request.auth != null
          && get(/databases/$(database)/documents/ticketBatches/$(batchId)).data.userId == request.auth.uid;
      }
    }

    // Audit logs — write by anyone authenticated, read by admin only
    match /auditLogs/{logId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "ADMIN";
    }
  }
}
```

---

## 7. NestJS Auth Guard (Firebase Token Verification)

```typescript
// server/src/common/guards/firebase-auth.guard.ts
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing auth token');
    }
    const token = authHeader.split('Bearer ')[1];
    const decoded = await this.firebaseAdmin.auth().verifyIdToken(token);
    request.user = decoded;   // { uid, email, role, ... }
    return true;
  }
}
```

---

## 8. Implementation Phases (All 10 Phases)

### Phase 1: Ticketing Platform — Foundation (Sprint 1-2)
**Goal:** Firebase project + Auth + App shell

| Task                                           | Estimate |
|------------------------------------------------|----------|
| Create Firebase project + enable services      | 0.5d     |
| Initialize React + Vite + Tailwind + shadcn/ui | 0.5d     |
| Firebase Auth integration (register/login)     | 1d       |
| `onUserCreate` Cloud Function                  | 0.5d     |
| Frontend: Login/Register pages                 | 1d       |
| Frontend: App shell (sidebar, header, layout)  | 1d       |
| Protected routes + auth context (Zustand)      | 0.5d     |
| Firestore security rules (base)               | 0.5d     |
| NestJS project scaffold + Cloud Run Dockerfile | 0.5d     |
| Firebase Auth guard in NestJS                  | 0.5d     |

### Phase 1: Ticketing — Integration Setup (Sprint 3)
**Goal:** Setup wizard + integration config via NestJS

| Task                                           | Estimate |
|------------------------------------------------|----------|
| NestJS IntegrationModule (encrypt/store creds) | 1d       |
| NestJS JiraModule (connection test endpoint)   | 1d       |
| NestJS ConfluenceModule (connection test)      | 0.5d     |
| NestJS TeamsModule (OAuth2 + connection test)  | 1.5d     |
| Frontend: Setup wizard (multi-step form)       | 2d       |
| Frontend: Integration settings page            | 1d       |

### Phase 1: Ticketing — Excel to Jira (Sprint 4-5)
**Goal:** Upload → Parse → Map → Validate → Bulk Create

| Task                                           | Estimate |
|------------------------------------------------|----------|
| Firebase Storage upload from frontend          | 0.5d     |
| `onFileUpload` Cloud Function (parse Excel)    | 1d       |
| NestJS ExcelModule (validate mapped data)      | 1d       |
| NestJS TicketsModule (bulk Jira creation)       | 1.5d     |
| `onTicketWrite` Cloud Function (batch stats)   | 0.5d     |
| Frontend: Drag-drop file upload                | 1d       |
| Frontend: Column mapper UI                     | 1.5d     |
| Frontend: Validation preview table             | 1d       |
| Frontend: Bulk creation progress (real-time)   | 1d       |
| Mapping templates (Firestore subcollection)    | 0.5d     |

### Phase 1: Ticketing — Teams + Confluence + Dashboard (Sprint 6-7)
**Goal:** Teams→Jira, Confluence reports, dashboard, audit

| Task                                           | Estimate |
|------------------------------------------------|----------|
| NestJS TeamsModule (list, fetch, filter msgs)  | 1.5d     |
| Message-to-ticket conversion                   | 1d       |
| Frontend: Channel browser + message list       | 2.5d     |
| NestJS ConfluenceModule (create/update page)   | 1d       |
| Report aggregation + `scheduledReport` function| 1.5d     |
| Frontend: Report builder + publish flow        | 1.5d     |
| Audit logging + dashboard + audit viewer       | 3d       |
| Role-based access (custom claims)              | 1d       |
| **Phase 1 deploy:** Firebase Hosting + Cloud Run| 1d      |
| Unit tests + E2E for Phase 1                   | 2d       |

---

### Phase 2: Test Case Management (Sprint 8-9)
**Goal:** Test case CRUD, suites, execution tracking

| Task                                           | Estimate |
|------------------------------------------------|----------|
| Firestore schema: testSuites, testCases, testRuns | 0.5d  |
| Firestore security rules for test collections  | 0.5d     |
| Frontend: Test suite tree view (folders)       | 1.5d     |
| Frontend: Test case editor (steps, expected)   | 1.5d     |
| Frontend: Test case list (search, filter, tag) | 1d       |
| Frontend: Test run creation (select cases, assign) | 1d    |
| Frontend: Test execution view (pass/fail/blocked) | 1.5d  |
| Bulk import test cases from Excel              | 1d       |
| Link test cases to Jira stories                | 0.5d     |
| `onTestResultWrite` Cloud Function             | 0.5d     |

### Phase 2: API Test Runner (Sprint 10-11)
**Goal:** Full API testing capability

| Task                                           | Estimate |
|------------------------------------------------|----------|
| Firestore schema: apiCollections, requests, runs | 0.5d   |
| NestJS APITestModule: request executor engine  | 2d       |
| NestJS: Assertion engine (status, body, headers, time) | 1d |
| NestJS: Chain resolver (extract + inject vars) | 1d       |
| NestJS: Collection runner (sequential + parallel) | 1d    |
| Frontend: Collection tree + folder management  | 1d       |
| Frontend: Request editor (method, URL, body, headers) | 2d |
| Frontend: Response viewer (body, headers, time) | 1d      |
| Frontend: Assertion builder UI                 | 1d       |
| Frontend: Environment variables manager        | 1d       |
| Frontend: Collection run results view          | 1d       |
| Import: Postman, Swagger/OpenAPI, cURL parsers | 2d       |

### Phase 2: Auto Bug Filing Engine (Sprint 11)
**Goal:** Automated Jira bug creation from any test failure

| Task                                           | Estimate |
|------------------------------------------------|----------|
| NestJS BugFilingEngine service                 | 1d       |
| Duplicate detection (Jira JQL search)          | 1d       |
| Attach screenshots/request-response to bug     | 0.5d     |
| Auto-priority + auto-label logic               | 0.5d     |
| Link bug to test case/run                      | 0.5d     |
| Configurable filing rules (Firestore config)   | 0.5d     |
| `onBugFiled` Cloud Function (notifications)    | 0.5d     |

---

### Phase 3: Web UI Test Runner — Playwright (Sprint 12-14)
**Goal:** Browser-based test automation for any web app

| Task                                           | Estimate |
|------------------------------------------------|----------|
| NestJS WebTestModule: Playwright runner engine | 2d       |
| Cross-browser config (Chrome, Firefox, Safari, Edge) | 0.5d |
| Screenshot + DOM snapshot capture on failure   | 1d       |
| Video recording integration                    | 1d       |
| Visual regression: pixel-diff engine           | 2d       |
| Baseline management (accept/reject changes)    | 1d       |
| Frontend: Test script editor (Monaco editor)   | 2d       |
| Frontend: Test execution view with real-time logs | 1.5d  |
| Frontend: Visual diff comparison viewer        | 1.5d     |
| Frontend: Viewport/device emulation selector   | 0.5d     |
| No-code recorder (browser extension) (P2)      | 3d       |
| Integration with Bug Filing Engine             | 0.5d     |

---

### Phase 4: Mobile Test Runner — Appium (Sprint 15-17)
**Goal:** Mobile test automation via Appium

| Task                                           | Estimate |
|------------------------------------------------|----------|
| NestJS MobileTestModule: Appium client wrapper | 2d       |
| Device manager service (list, status, connect) | 1.5d     |
| Desired capabilities builder + validator       | 1d       |
| App upload to Firebase Storage + install       | 0.5d     |
| Gesture support (swipe, pinch, long-press)     | 1d       |
| Screenshot + device log capture on failure     | 1d       |
| Frontend: Device manager UI                    | 1.5d     |
| Frontend: Capabilities builder UI              | 1d       |
| Frontend: Test script editor (Appium/WDIO)     | 2d       |
| Frontend: Test execution with real-time logs   | 1.5d     |
| Frontend: Device/OS matrix results view        | 1d       |
| Cloud device farm integration (BrowserStack) (P2) | 2d    |
| Integration with Bug Filing Engine             | 0.5d     |

---

### Phase 5: Security Scanner (Sprint 18-19)
**Goal:** Automated security vulnerability scanning

| Task                                           | Estimate |
|------------------------------------------------|----------|
| NestJS SecurityModule: OWASP ZAP integration   | 2d       |
| Header analyzer service                        | 0.5d     |
| SSL/TLS checker service                        | 0.5d     |
| Port scanner service                           | 0.5d     |
| SQLi + XSS + CSRF detection                   | 2d       |
| Severity classification engine                 | 0.5d     |
| Security report generator (PDF/HTML)           | 1d       |
| Frontend: Scan configuration UI               | 1d       |
| Frontend: Results dashboard (by severity)      | 1.5d     |
| Frontend: Finding detail view + remediation    | 1d       |
| Integration with Bug Filing Engine             | 0.5d     |
| `scheduledSecScan` Cloud Function              | 0.5d     |

### Phase 5: Unified QA Dashboard (Sprint 20)
**Goal:** Single pane of glass for all test results

| Task                                           | Estimate |
|------------------------------------------------|----------|
| Firestore aggregation queries for all test types | 1d     |
| Frontend: Unified dashboard layout             | 1.5d     |
| Frontend: Pass/fail trend charts (Chart.js/Recharts) | 1d |
| Frontend: Flaky test detection view            | 0.5d     |
| Frontend: Coverage matrix view                 | 1d       |
| Frontend: Failure grouping view                | 0.5d     |
| Export to PDF/Confluence                       | 1d       |

---

### Phase 6: Performance & Load Testing (Sprint 21-22)
**Goal:** Load testing and web performance audits

| Task                                           | Estimate |
|------------------------------------------------|----------|
| NestJS PerfModule: k6 runner integration       | 2d       |
| Load test config: VUs, ramp-up, duration, thresholds | 1d |
| Real-time metrics streaming during load test   | 1d       |
| Lighthouse runner integration                  | 1d       |
| Frontend: Load test builder UI                 | 1.5d     |
| Frontend: Real-time performance graphs         | 1.5d     |
| Frontend: Lighthouse results view              | 1d       |
| Frontend: Run comparison view                  | 1d       |
| Integration with Bug Filing Engine             | 0.5d     |

---

### Phase 7: Test Data Generator (Sprint 23-24)
**Goal:** Realistic test data generation and seeding

| Task                                           | Estimate |
|------------------------------------------------|----------|
| NestJS TestDataModule: Faker.js integration    | 1d       |
| Schema-based generator (JSON schema → data)    | 1.5d     |
| Relational data generator (foreign keys)       | 1d       |
| Export service (JSON, CSV, SQL, Excel)          | 1d       |
| API seeding service (POST to target endpoint)  | 0.5d     |
| Frontend: Schema builder UI                    | 1.5d     |
| Frontend: Preset selector + locale picker      | 1d       |
| Frontend: Preview + export controls            | 1d       |

### Phase 7: Environment Manager (Sprint 24-25)
**Goal:** Centralized environment registry and monitoring

| Task                                           | Estimate |
|------------------------------------------------|----------|
| Firestore schema: environments                 | 0.5d     |
| NestJS EnvironmentModule: health checker       | 1d       |
| NestJS: Config diff service                    | 0.5d     |
| `envHealthCheck` Cloud Function (5-min cron)   | 0.5d     |
| Frontend: Environment registry CRUD            | 1d       |
| Frontend: Health dashboard (up/down/degraded)  | 1d       |
| Frontend: Quick switch in all test runners     | 1d       |
| Frontend: Config diff viewer                   | 0.5d     |

---

### Phase 8: Notification & Alerting Hub (Sprint 26-27)
**Goal:** Multi-channel notifications with smart rules

| Task                                           | Estimate |
|------------------------------------------------|----------|
| Firestore schema: notifications, alertRules    | 0.5d     |
| NestJS NotificationsModule: Slack integration  | 1d       |
| NestJS: Teams webhook integration              | 0.5d     |
| NestJS: Email sending (SendGrid/Firebase)      | 1d       |
| NestJS: Generic webhook dispatcher             | 0.5d     |
| `onNotificationCreate` Cloud Function          | 0.5d     |
| `onTestFailEscalation` Cloud Function          | 0.5d     |
| Frontend: Notification bell (real-time)        | 1d       |
| Frontend: Notification preferences page        | 1d       |
| Frontend: Alert rules builder                  | 1.5d     |
| Frontend: Digest configuration                 | 0.5d     |

---

### Phase 9: CI/CD Pipeline Integration (Sprint 28-29)
**Goal:** Connect test execution to CI/CD pipelines

| Task                                           | Estimate |
|------------------------------------------------|----------|
| NestJS CICDModule: Trigger API endpoint        | 1d       |
| Webhook receiver (GitHub, Jenkins, GitLab)     | 1d       |
| Quality gate service (pass/fail response)      | 0.5d     |
| PR comment service (GitHub API)                | 1d       |
| GitHub Action YAML template                    | 0.5d     |
| Jenkins plugin/webhook config docs             | 0.5d     |
| Frontend: Pipeline dashboard                   | 1.5d     |
| Frontend: Trigger configuration UI             | 1d       |
| Frontend: Build → test result linkage view     | 1d       |

---

### Phase 10: Accessibility Testing (Sprint 30-31)
**Goal:** WCAG compliance scanning

| Task                                           | Estimate |
|------------------------------------------------|----------|
| NestJS A11yModule: axe-core integration        | 1.5d     |
| Color contrast checker service                 | 0.5d     |
| Compliance report generator                    | 1d       |
| Frontend: Scan configuration UI               | 1d       |
| Frontend: Results with element highlighting    | 1.5d     |
| Frontend: WCAG checklist view                  | 1d       |
| Frontend: Score trend charts                   | 0.5d     |
| Integration with Bug Filing Engine             | 0.5d     |

### Phase 10: Log Analyzer (Sprint 31-32)
**Goal:** Application log aggregation and error detection

| Task                                           | Estimate |
|------------------------------------------------|----------|
| NestJS LogAnalyzerModule: log source connectors | 2d      |
| Error fingerprinting + grouping engine         | 1.5d     |
| Search/filter service                          | 1d       |
| Alert rules engine (spike detection)           | 1d       |
| Frontend: Log source configuration             | 1d       |
| Frontend: Log search + filter UI               | 1.5d     |
| Frontend: Error group dashboard                | 1d       |
| Frontend: Alert rules configuration            | 0.5d     |
| Integration with Bug Filing Engine             | 0.5d     |

---

### Phase 11: AI Intelligence Engine (Sprint 33-36)
**Goal:** AI-powered generation of test cases, scripts, and release notes

| Task                                           | Estimate |
|------------------------------------------------|----------|
| NestJS AIModule: Claude/OpenAI API integration | 1.5d     |
| Test case generator from Jira stories          | 2d       |
| Test case generator from Swagger/OpenAPI specs | 1.5d     |
| AI refinement engine (improve existing cases)  | 1d       |
| Missing scenario suggester (edge/negative)     | 1d       |
| Playwright script generator                    | 2d       |
| Appium/WDIO script generator                   | 2d       |
| API test script generator                      | 1.5d     |
| BDD/Gherkin feature file generator             | 1d       |
| Release notes generator (Jira sprint/version)  | 2d       |
| Release notes templates + formatting engine    | 1d       |
| Publish release notes (Confluence, Slack, GitHub)| 1d      |
| Multi-language output (JS, TS, Python, Java)   | 1d       |
| Frontend: AI generation hub page              | 1.5d     |
| Frontend: Test case generator UI (Jira picker) | 1.5d     |
| Frontend: Script generator UI (Monaco preview) | 2d       |
| Frontend: Release notes builder + publisher    | 1.5d     |
| Frontend: Appium script generator UI           | 1.5d     |
| One-click save to target module                | 0.5d     |
| `onAIGenComplete` Cloud Function               | 0.5d     |

---

### Phase 12: Contract Testing — Pact (Sprint 37-38)
**Goal:** Consumer-driven contract verification

| Task                                           | Estimate |
|------------------------------------------------|----------|
| NestJS ContractModule: Pact.js integration     | 2d       |
| Consumer contract definition service           | 1d       |
| Provider verification service                  | 1.5d     |
| Contract versioning + breaking change detection| 1d       |
| Frontend: Contract definition UI              | 1.5d     |
| Frontend: Verification results + diff viewer  | 1.5d     |
| CI/CD quality gate integration                | 0.5d     |
| `onContractVerify` Cloud Function              | 0.5d     |

---

### Phase 13: Chaos Engineering (Sprint 39-40)
**Goal:** Fault injection and resilience testing

| Task                                           | Estimate |
|------------------------------------------------|----------|
| NestJS ChaosModule: fault injection framework  | 2d       |
| Latency injector                               | 1d       |
| HTTP error injector (500, 503, timeout)        | 1d       |
| CPU/memory stress injector                     | 1d       |
| Dependency failure simulator                   | 1d       |
| Blast radius controls                          | 0.5d     |
| Recovery validation engine                     | 1d       |
| Experiment report generator                    | 1d       |
| Frontend: Experiment builder UI               | 1.5d     |
| Frontend: Real-time experiment monitoring      | 1d       |
| Frontend: Results + recovery report            | 1d       |
| `scheduledChaos` Cloud Function                | 0.5d     |

---

### Phase 14: Database Testing + Snapshot Testing (Sprint 41-43)
**Goal:** Direct database testing and snapshot comparison

| Task                                           | Estimate |
|------------------------------------------------|----------|
| NestJS DBTestModule: PostgreSQL connector      | 1d       |
| MySQL + MongoDB connectors                     | 1.5d     |
| SQL query execution + result validation        | 1d       |
| Schema migration diff engine                   | 1.5d     |
| Data integrity checker                         | 1d       |
| Slow query detector                            | 0.5d     |
| Frontend: DB connection manager               | 1d       |
| Frontend: Query editor + results viewer       | 1.5d     |
| Frontend: Schema diff viewer                   | 1d       |
| NestJS SnapshotModule: JSON diff engine        | 1.5d     |
| API response snapshot capture                  | 0.5d     |
| Baseline management + approval workflow        | 1d       |
| Frontend: Snapshot diff viewer (inline changes)| 1.5d     |
| Frontend: Baseline management UI              | 1d       |
| CI/CD integration (fail on unexpected diff)    | 0.5d     |

---

### Phase 15: Flake Analyzer + Multi-Region (Sprint 44-46)
**Goal:** Flaky test management and geographic testing

| Task                                           | Estimate |
|------------------------------------------------|----------|
| NestJS FlakeModule: history tracking engine    | 1d       |
| Flake score calculation algorithm              | 0.5d     |
| Auto-quarantine logic                          | 0.5d     |
| Root cause suggestion engine                   | 1d       |
| `onFlakeDetected` Cloud Function               | 0.5d     |
| Frontend: Flake dashboard (scores, trends)     | 1.5d     |
| Frontend: Quarantine management               | 0.5d     |
| NestJS RegionModule: multi-region dispatcher   | 2d       |
| Cloud Run multi-region deployment config       | 1d       |
| Region latency comparison service              | 0.5d     |
| CDN validation service                         | 0.5d     |
| Frontend: Region test configuration           | 1d       |
| Frontend: Region results matrix               | 1d       |

---

### Phase 16: Compliance + Coverage + Release Gate (Sprint 47-50)
**Goal:** Enterprise readiness — compliance, coverage, and release control

| Task                                           | Estimate |
|------------------------------------------------|----------|
| Firestore schema: compliance, coverage, gates  | 0.5d     |
| Frontend: SOC2/GDPR compliance checklist       | 2d       |
| Frontend: Evidence linking (tests → requirements)| 1d     |
| Compliance report export (PDF)                 | 1d       |
| NestJS CoverageModule: Istanbul/NYC parser     | 1d       |
| NestJS: JaCoCo parser (Java coverage)          | 0.5d     |
| Coverage-to-test-case mapping engine           | 1.5d     |
| Frontend: Coverage dashboard + gap analysis    | 1.5d     |
| Frontend: Coverage trend charts                | 0.5d     |
| NestJS ReleaseGateModule: signal aggregator    | 1.5d     |
| Configurable criteria engine                   | 1d       |
| Visual scorecard generator (green/yellow/red)  | 0.5d     |
| Approval workflow (multi-role sign-off)        | 1d       |
| Auto-generate release notes on gate pass (AI)  | 0.5d     |
| CI/CD deployment block on gate fail            | 0.5d     |
| `onReleaseGateEval` Cloud Function             | 0.5d     |
| Frontend: Release gate configuration          | 1d       |
| Frontend: Scorecard + approval UI             | 1.5d     |
| Frontend: Release history view                 | 1d       |

---

## 9. Key Technical Decisions

### Authentication — Firebase Auth (not custom JWT)
- Zero backend code for auth flows
- Built-in email/password, Google, Microsoft providers
- ID tokens verified in NestJS via Firebase Admin SDK
- Custom claims for role-based access

### Database — Cloud Firestore (not PostgreSQL)
- Real-time listeners for progress updates (bulk creation)
- No server needed for reads/writes from frontend
- Security rules enforce access control at DB level
- Auto-scales, zero maintenance

### NestJS on Cloud Run (not always-on server)
- Scales to zero when idle (cost-effective)
- Auto-scales on traffic spikes
- Container-based = portable
- Full NestJS framework for structured code

### Cloud Functions (event-driven only)
- Triggered by Firebase events (auth, storage, firestore)
- Scheduled jobs (cron for reports)
- Thin functions, not business logic

### Real-Time Progress (Firestore Listeners)
- Bulk ticket creation updates Firestore docs
- Frontend listens via `onSnapshot` for live progress
- No WebSocket server needed

---

## 10. Deployment Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                        │
│                                                                │
│  ┌──────────────┐  ┌─────────────────────────────────────┐    │
│  │ Firebase      │  │ Cloud Run (NestJS API)               │    │
│  │ Hosting (CDN) │  │                                      │    │
│  │ → React SPA   │  │  Phase 1: Jira, Confluence, Teams   │    │
│  └──────┬───────┘  │  Phase 2: API Test Runner, Bug Filing│    │
│         │          │  Phase 3: Playwright Runner           │    │
│         │          │  Phase 4: Appium Runner               │    │
│         │          │  Phase 5: Security Scanner (ZAP)      │    │
│         │          │  Phase 6: k6 Load Runner, Lighthouse  │    │
│         │          │  Phase 7: Test Data, Env Manager      │    │
│         │          │  Phase 8: Notification Dispatcher      │    │
│         │          │  Phase 9: CI/CD Webhooks + Gates      │    │
│         │          │  Phase 10: axe-core, Log Analyzer     │    │
│         │          │  Phase 11: AI Engine (Claude/OpenAI)  │    │
│         │          │  Phase 12: Contract Testing (Pact)    │    │
│         │          │  Phase 13: Chaos Engineering           │    │
���         │          │  Phase 14: DB Testing, Snapshots      │    │
│         │          │  Phase 15: Flake Analyzer, Multi-Reg  │    │
│         │          │  Phase 16: Compliance, Coverage, Gate │    │
│         │          │  Addons: Scheduler, Teams, Projects   │    │
│         │          │  Addons: Webhooks, Masking, Analytics │    │
│         │          │  → Auto-scales, Scales to zero        │    │
│         │          └──────────────┬────────────────────┘    │
│         │                         │                          │
│  ┌──────┴─────────────────────────┴───────────────────────┐ │
│  │              Firebase Services                          │ │
│  │  Auth │ Firestore │ Storage │ Cloud Functions           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                         │                                     │
│  ┌──────────────────────┴──────────────────────────────────┐ │
│  │              External Services                           │ │
│  │  Jira │ Confluence │ MS Teams │ OWASP ZAP │ Appium     │ │
��  │  GitHub │ Jenkins │ Slack │ SendGrid │ BrowserStack     │ │
���  │  Claude API │ OpenAI API │ Pact Broker │ Chaos Toolkit │ ���
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

### Deploy Commands
```bash
# Frontend → Firebase Hosting
cd client && npm run build
firebase deploy --only hosting

# NestJS → Cloud Run
cd server
gcloud run deploy jira-automation-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated

# Cloud Functions
firebase deploy --only functions
```

---

## 11. Environment Configuration

```env
# .env (client)
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
VITE_NESTJS_API_URL=https://api-xxx.run.app

# .env (server — NestJS)
FIREBASE_PROJECT_ID=xxx
FIREBASE_CLIENT_EMAIL=xxx@xxx.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
ENCRYPTION_KEY=32-byte-hex-key-for-aes-256
PORT=8080

# AI Engine (Phase 11)
AI_PROVIDER=claude                       # "claude" | "openai"
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
AI_MODEL=claude-sonnet-4-6

# Chaos Engineering (Phase 13)
CHAOS_ENABLED=false                      # Safety: disabled by default
```

---

## 12. Definition of Done

Each feature is considered done when:
- [ ] Code is TypeScript (strict mode, no `any`)
- [ ] NestJS endpoints have DTO validation (class-validator)
- [ ] Firestore security rules cover the collection
- [ ] Error states handled in UI with toast notifications
- [ ] Loading/progress states shown during async ops
- [ ] Audit log entry created for user actions
- [ ] Works in Firebase Emulator Suite locally
- [ ] No console errors or warnings

---

## 13. Phase Summary & Sprint Timeline

| Phase | Focus | Sprints | Sprint # | Key Deliverables |
|-------|-------|---------|----------|------------------|
| **1** | Ticketing Platform | 7 | 1-7 | Auth, Excel→Jira, Teams→Jira, Confluence, Dashboard |
| **2** | QA Core | 4 | 8-11 | Test Cases, API Runner, Auto Bug Filing |
| **3** | Web Testing | 3 | 12-14 | Playwright Runner, Visual Regression, No-Code Recorder |
| **4** | Mobile Testing | 3 | 15-17 | Appium Runner, Device Manager, Cloud Farms |
| **5** | Security + QA Dashboard | 3 | 18-20 | OWASP Scanner, Unified Dashboard |
| **6** | Performance Testing | 2 | 21-22 | k6 Load Testing, Lighthouse Audits |
| **7** | Test Data + Environments | 3 | 23-25 | Data Generator, Environment Manager |
| **8** | Notifications | 2 | 26-27 | Multi-channel Alerts, Escalation Rules |
| **9** | CI/CD Integration | 2 | 28-29 | GitHub/Jenkins/GitLab, Quality Gates |
| **10** | Accessibility + Logs | 3 | 30-32 | WCAG Scanner, Log Analyzer |
| **11** | **AI Intelligence Engine** | **4** | **33-36** | **Test Case Gen, Script Gen (Playwright/Appium/API), Release Notes Gen, BDD/Gherkin Gen** |
| **12** | **Contract Testing** | **2** | **37-38** | **Pact.js, Consumer/Provider Verification, Breaking Change Detection** |
| **13** | **Chaos Engineering** | **2** | **39-40** | **Fault Injection, Latency/Error/Stress, Recovery Validation** |
| **14** | **DB Testing + Snapshots** | **3** | **41-43** | **SQL/NoSQL Testing, Schema Diff, JSON Snapshot Comparison** |
| **15** | **Flake Analyzer + Multi-Region** | **3** | **44-46** | **Flake Detection/Quarantine, Geographic Testing, CDN Validation** |
| **16** | **Compliance + Coverage + Release Gate** | **4** | **47-50** | **SOC2/GDPR, Code Coverage Mapping, Go/No-Go Gate, Auto Release Notes** |
| | | | | |
| **Addon Phases** | | | | |
| **A1** | **No-Code Test Recorder** | **1** | **51** | **Visual step builder, Script generation (Playwright/Appium)** |
| **A2** | **Test Scheduling (Cron)** | **1** | **52** | **Cron scheduler, Execution history, Run Now trigger** |
| **A3** | **Team Management** | **1** | **53** | **Team invitations, Role assignment, Team settings** |
| **A4** | **Multi-Project Support** | **1** | **54** | **Project CRUD, Project switching, Per-project Jira config** |
| **A5** | **PDF Report Generator** | **1** | **55** | **Branded PDF reports, Print-optimized CSS, Multiple report types** |
| **A6** | **Custom Dashboard Builder** | **2** | **56-57** | **Drag-and-drop widgets, Data source config, Layout persistence** |
| **A7** | **Webhook Management** | **1** | **58** | **Incoming/outgoing webhooks, Delivery history, Test payloads** |
| **A8** | **API Usage Analytics** | **1** | **59** | **Volume tracking, Response time charts, Per-endpoint breakdown** |
| **A9** | **Data Masking** | **1** | **60** | **PII pattern matching, Masking types, Test data integration** |
| | **Grand Total** | **60 sprints** | | |
