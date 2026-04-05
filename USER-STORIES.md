# User Stories — Intelligent Test Automation & Ticketing Platform

## Document Info

| Field   | Value                                      |
|---------|------------------------------------------  |
| Version | 2.0                                        |
| Created | 2026-04-04                                 |
| Status  | Draft                                      |
| Arch    | Hybrid — Firebase + NestJS on Cloud Run    |

---

## Epic 1: Authentication & Access Control

### US-1.1: User Registration (Firebase Auth)
**As a** new user
**I want to** register an account with my email and password
**So that** I can access the platform securely

**Acceptance Criteria:**
- [ ] Registration form with email, password, confirm password, and full name
- [ ] Firebase Auth `createUserWithEmailAndPassword` SDK call
- [ ] Email format validation (client-side + Firebase)
- [ ] Password strength enforcement (min 8 chars, uppercase, lowercase, number, special char)
- [ ] Duplicate email handled by Firebase error
- [ ] `onUserCreate` Cloud Function creates Firestore user profile
- [ ] Success confirmation and redirect to dashboard
- [ ] Error messages displayed inline

**Story Points:** 3
**Priority:** P0
**Linked Requirements:** AUTH-001

---

### US-1.2: User Login (Firebase Auth)
**As a** registered user
**I want to** log in with my credentials
**So that** I can access my workspace and tools

**Acceptance Criteria:**
- [ ] Login form with email and password
- [ ] Firebase Auth `signInWithEmailAndPassword` SDK call
- [ ] Firebase ID token auto-managed by SDK
- [ ] Invalid credentials show Firebase error message
- [ ] Redirect to dashboard on success
- [ ] Google/Microsoft SSO buttons (P2)

**Story Points:** 3
**Priority:** P0
**Linked Requirements:** AUTH-002, AUTH-003, AUTH-007

---

### US-1.3: Session Persistence (Firebase Auth)
**As a** logged-in user
**I want** my session to persist and refresh automatically
**So that** I don't have to re-login frequently

**Acceptance Criteria:**
- [ ] Firebase Auth `onAuthStateChanged` observer in Zustand store
- [ ] Session persists across browser refreshes (Firebase default)
- [ ] ID token auto-refreshes (Firebase handles this)
- [ ] Logout via `signOut()` clears session
- [ ] Expired/invalid session redirects to login

**Story Points:** 2
**Priority:** P0
**Linked Requirements:** AUTH-003

---

### US-1.4: Password Reset (Firebase Auth)
**As a** user who forgot my password
**I want to** reset it via email
**So that** I can regain access to my account

**Acceptance Criteria:**
- [ ] "Forgot password" link on login page
- [ ] Email input form → `sendPasswordResetEmail` Firebase call
- [ ] Firebase sends reset email automatically
- [ ] Success confirmation shown on page
- [ ] Error handling for non-existent email

**Story Points:** 2
**Priority:** P1
**Linked Requirements:** AUTH-006

---

### US-1.5: Role-Based Access
**As an** admin
**I want to** assign roles to users
**So that** I can control who has access to what features

**Acceptance Criteria:**
- [ ] Three roles: Admin, Manager, User
- [ ] Admin can manage users and all settings
- [ ] Manager can create tickets and view reports
- [ ] User can create tickets only
- [ ] Unauthorized access shows 403 page

**Story Points:** 8
**Priority:** P1
**Linked Requirements:** AUTH-004

---

## Epic 2: First-Time Setup & Integration Configuration

### US-2.1: Setup Wizard
**As a** first-time user (Admin)
**I want to** be guided through integration setup
**So that** I can configure all necessary connections without confusion

**Acceptance Criteria:**
- [ ] Multi-step wizard (Welcome > Jira > Confluence > Teams > Complete)
- [ ] Progress indicator showing current step
- [ ] Back/Next navigation between steps
- [ ] Skip option for optional integrations
- [ ] Completion summary page

**Story Points:** 8
**Priority:** P0
**Linked Requirements:** SETUP-001

---

### US-2.2: Jira Integration Setup
**As an** admin
**I want to** configure Jira Cloud connection
**So that** the platform can create tickets in my Jira instance

**Acceptance Criteria:**
- [ ] Form fields: Jira Base URL, Email, API Token
- [ ] "Test Connection" calls NestJS `POST /integrations/JIRA/test`
- [ ] NestJS encrypts credentials (AES-256) and stores in Firestore
- [ ] Success: shows connected projects list
- [ ] Failure: shows specific error message
- [ ] Select default project for ticket creation

**Story Points:** 5
**Priority:** P0
**Linked Requirements:** SETUP-002, SETUP-005, SETUP-006

---

### US-2.3: Confluence Integration Setup
**As an** admin
**I want to** configure Confluence connection
**So that** reports can be published to our wiki

**Acceptance Criteria:**
- [ ] Form fields: Confluence Base URL, Email, API Token, Space Key
- [ ] "Test Connection" button
- [ ] Success: shows accessible spaces
- [ ] Select default space and parent page
- [ ] Credentials encrypted before storage

**Story Points:** 5
**Priority:** P0
**Linked Requirements:** SETUP-003, SETUP-005, SETUP-006

---

### US-2.4: Microsoft Teams Integration Setup
**As an** admin
**I want to** configure Microsoft Teams connection
**So that** the platform can read channel messages

**Acceptance Criteria:**
- [ ] Form fields: Tenant ID, Client ID, Client Secret
- [ ] OAuth2 authentication flow
- [ ] "Test Connection" shows accessible teams
- [ ] Permission scope validation
- [ ] Credentials encrypted before storage

**Story Points:** 8
**Priority:** P0
**Linked Requirements:** SETUP-004, SETUP-005, SETUP-006

---

### US-2.5: Edit Integration Settings
**As an** admin
**I want to** update my integration credentials
**So that** I can rotate keys or fix configuration issues

**Acceptance Criteria:**
- [ ] Settings page listing all integrations with status
- [ ] Edit button per integration
- [ ] Re-test connection after update
- [ ] Green/Red status indicators
- [ ] Last connected timestamp

**Story Points:** 5
**Priority:** P1
**Linked Requirements:** SETUP-007, SETUP-008

---

## Epic 3: Excel to Jira Automation

### US-3.1: Upload Excel File
**As a** user
**I want to** upload an Excel or CSV file
**So that** I can create Jira tickets from spreadsheet data

**Acceptance Criteria:**
- [ ] Drag-and-drop upload zone
- [ ] File type validation (.xlsx, .xls, .csv)
- [ ] File size limit (10MB)
- [ ] Upload to Firebase Storage (direct from frontend)
- [ ] `onFileUpload` Cloud Function triggers → parses file → stores parsed data in Firestore
- [ ] Frontend listens to Firestore for parsed result (real-time)
- [ ] Preview first 5 rows after parsing complete
- [ ] Error message for invalid files

**Story Points:** 5
**Priority:** P0
**Linked Requirements:** EXCEL-001, EXCEL-002

---

### US-3.2: Map Columns to Jira Fields
**As a** user
**I want to** map Excel columns to Jira ticket fields
**So that** data is correctly placed in each ticket

**Acceptance Criteria:**
- [ ] Dropdown per Excel column to select Jira field
- [ ] Available Jira fields: Summary, Description, Priority, Labels, Assignee, Sprint, Story Points, Issue Type, Epic Link
- [ ] Required field indicators (Summary is mandatory)
- [ ] Preview of mapped data in ticket format
- [ ] Save mapping as template for reuse
- [ ] Load previously saved templates

**Story Points:** 8
**Priority:** P0
**Linked Requirements:** EXCEL-003, EXCEL-004, EXCEL-009

---

### US-3.3: Validate and Preview Tickets
**As a** user
**I want to** validate and preview tickets before creation
**So that** I can catch errors before they reach Jira

**Acceptance Criteria:**
- [ ] Validation checks: required fields filled, valid priority values, assignee exists
- [ ] Row-level validation status (pass/fail with reason)
- [ ] Edit individual rows inline
- [ ] Remove rows from batch
- [ ] Total count of valid vs invalid rows
- [ ] Dry-run mode toggle

**Story Points:** 8
**Priority:** P0
**Linked Requirements:** EXCEL-005, EXCEL-010, EXCEL-011

---

### US-3.4: Bulk Create Jira Tickets
**As a** user
**I want to** create all validated tickets in Jira at once
**So that** I save time compared to manual creation

**Acceptance Criteria:**
- [ ] "Create Tickets" button (disabled until validation passes)
- [ ] Calls NestJS `POST /excel/create-tickets` with batch data
- [ ] NestJS creates tickets in Jira and writes results to Firestore
- [ ] Frontend uses Firestore `onSnapshot` for real-time progress
- [ ] Progress bar showing X of Y tickets created
- [ ] Real-time status per row (pending/creating/success/failed)
- [ ] `onTicketWrite` Cloud Function updates batch stats automatically
- [ ] Error details for failed rows
- [ ] Clickable Jira ticket links for created tickets
- [ ] Summary: total created, failed, skipped
- [ ] Option to retry failed tickets via NestJS

**Story Points:** 8
**Priority:** P0
**Linked Requirements:** EXCEL-006, EXCEL-007, EXCEL-008

---

## Epic 4: Teams Chat to Jira Conversion

### US-4.1: Browse Teams Channels
**As a** user
**I want to** browse my Teams and channels
**So that** I can select which channel to pull messages from

**Acceptance Criteria:**
- [ ] List of joined Teams
- [ ] Expandable channel list per team
- [ ] Search/filter for channels
- [ ] Channel selection with visual indicator

**Story Points:** 5
**Priority:** P0
**Linked Requirements:** TEAMS-001, TEAMS-002

---

### US-4.2: Fetch and Filter Messages
**As a** user
**I want to** fetch messages from a channel with filters
**So that** I only see relevant messages for ticket creation

**Acceptance Criteria:**
- [ ] Date range picker (from/to)
- [ ] Keyword filter input
- [ ] Sender filter
- [ ] Fetch button with loading state
- [ ] Message list with sender, timestamp, content preview
- [ ] Message count indicator
- [ ] Pagination for large result sets

**Story Points:** 8
**Priority:** P0
**Linked Requirements:** TEAMS-003, TEAMS-004, TEAMS-005

---

### US-4.3: Select and Convert Messages to Tickets
**As a** user
**I want to** select messages and convert them to Jira tickets
**So that** actionable items from chat become tracked work items

**Acceptance Criteria:**
- [ ] Checkbox per message for selection
- [ ] Select all / deselect all
- [ ] "Convert to Tickets" button
- [ ] Auto-map: message content to Description, first line to Summary
- [ ] Editable ticket preview before creation
- [ ] Include message link/timestamp in ticket description
- [ ] Thread context option (include replies)

**Story Points:** 8
**Priority:** P0
**Linked Requirements:** TEAMS-006, TEAMS-007, TEAMS-008, TEAMS-011

---

### US-4.4: Batch Create from Messages
**As a** user
**I want to** create multiple tickets from selected messages at once
**So that** I can efficiently process a batch of action items

**Acceptance Criteria:**
- [ ] Same bulk creation flow as Excel (progress, status, retry)
- [ ] Created ticket links displayed per message
- [ ] Summary of batch results

**Story Points:** 5
**Priority:** P0
**Linked Requirements:** TEAMS-008

---

## Epic 5: Confluence Reporting

### US-5.1: Generate Ticket Summary Report
**As a** user
**I want to** generate a summary of tickets I created
**So that** I can share progress with my team

**Acceptance Criteria:**
- [ ] Select date range or session for report
- [ ] Summary includes: ticket key, summary, type, priority, assignee, status
- [ ] Table format with sortable columns
- [ ] Total count and breakdown by type/priority
- [ ] Preview report before publishing

**Story Points:** 5
**Priority:** P0
**Linked Requirements:** CONF-001, CONF-002, CONF-008

---

### US-5.2: Publish to Confluence
**As a** user
**I want to** publish the report to a Confluence page
**So that** stakeholders can view it without logging into this tool

**Acceptance Criteria:**
- [ ] Select target Confluence space
- [ ] Create new page or append to existing page
- [ ] Custom page title input
- [ ] Rich formatting in Confluence (tables, headers)
- [ ] Success confirmation with link to published page
- [ ] Error handling with retry option

**Story Points:** 8
**Priority:** P0
**Linked Requirements:** CONF-003, CONF-004, CONF-005

---

### US-5.3: Scheduled Report Publishing
**As a** manager
**I want** reports to auto-publish on a schedule
**So that** Confluence stays updated without manual effort

**Acceptance Criteria:**
- [ ] Schedule options: daily, weekly, custom cron
- [ ] Select which data to include
- [ ] Target page configuration
- [ ] Enable/disable schedule
- [ ] History of published reports

**Story Points:** 8
**Priority:** P2
**Linked Requirements:** CONF-007

---

## Epic 6: Audit & Activity Tracking

### US-6.1: View Audit Logs
**As an** admin
**I want to** view all system activity
**So that** I can monitor usage and ensure compliance

**Acceptance Criteria:**
- [ ] Audit log table: timestamp, user, action, details, status
- [ ] Filter by: user, action type, date range, status
- [ ] Search by keyword
- [ ] Pagination (50 per page)
- [ ] Newest first by default

**Story Points:** 5
**Priority:** P1
**Linked Requirements:** AUDIT-001, AUDIT-002, AUDIT-003, AUDIT-004

---

### US-6.2: Export Audit Logs
**As an** admin
**I want to** export audit logs
**So that** I can archive or share them for compliance

**Acceptance Criteria:**
- [ ] Export filtered results
- [ ] Format options: CSV, JSON
- [ ] Download with timestamped filename
- [ ] Export size limit warning (>10K rows)

**Story Points:** 3
**Priority:** P2
**Linked Requirements:** AUDIT-005

---

## Epic 7: Dashboard

### US-7.1: Overview Dashboard
**As a** user
**I want to** see key metrics on login
**So that** I have quick visibility into recent activity

**Acceptance Criteria:**
- [ ] Metric cards: tickets created today, this week, this month
- [ ] Source breakdown pie chart (Excel vs Teams)
- [ ] Recent activity timeline (last 10 actions)
- [ ] Integration health status indicators
- [ ] Quick action buttons (Upload Excel, Browse Teams, Generate Report)

**Story Points:** 8
**Priority:** P1
**Linked Requirements:** DASH-001, DASH-002, DASH-003, DASH-004, DASH-005

---

## Epic 8: Test Case Management (Phase 2)

### US-8.1: Create & Organize Test Cases
**As a** QA engineer
**I want to** create test cases organized into suites
**So that** I have a structured repository of all test scenarios

**Acceptance Criteria:**
- [ ] Create test case: title, preconditions, steps, expected results
- [ ] Organize into suites and folders (tree structure)
- [ ] Tag by module, priority, type (smoke/regression/sanity)
- [ ] Search and filter test cases
- [ ] Clone test cases and suites
- [ ] Version history per test case

**Story Points:** 8
**Priority:** P0
**Linked Requirements:** TCM-001, TCM-002, TCM-003, TCM-008

---

### US-8.2: Execute Test Runs
**As a** QA lead
**I want to** create test runs and assign them to QA members
**So that** we can track test execution progress per sprint/release

**Acceptance Criteria:**
- [ ] Select test cases → create test run → assign to QA
- [ ] Execute with status: pass/fail/blocked/skipped per case
- [ ] Add notes/comments during execution
- [ ] Real-time progress tracking (X of Y complete)
- [ ] Link test run to Jira sprint/release
- [ ] Auto-file bug on fail (via Bug Filing Engine)

**Story Points:** 8
**Priority:** P0
**Linked Requirements:** TCM-005, TCM-006, ABF-001

---

### US-8.3: Import Test Cases from Excel
**As a** QA engineer
**I want to** bulk import test cases from Excel
**So that** I can migrate existing test cases quickly

**Acceptance Criteria:**
- [ ] Upload Excel with test case columns
- [ ] Map columns to test case fields
- [ ] Preview and validate before import
- [ ] Import with progress indicator
- [ ] Duplicate detection

**Story Points:** 5
**Priority:** P1
**Linked Requirements:** TCM-007

---

## Epic 9: API Test Runner (Phase 2)

### US-9.1: Build API Test Collections
**As a** QA engineer
**I want to** create API test collections with requests and assertions
**So that** I can test any REST or GraphQL API endpoint

**Acceptance Criteria:**
- [ ] Create collections with folder organization
- [ ] Request editor: method, URL, headers, body, query params, auth
- [ ] Support REST and GraphQL
- [ ] Assertion builder: status code, body (JSONPath), headers, response time
- [ ] Environment variables with quick switch (dev/staging/prod)
- [ ] Import from Postman, Swagger/OpenAPI, cURL

**Story Points:** 13
**Priority:** P0
**Linked Requirements:** API-001 through API-008

---

### US-9.2: Execute and Chain API Tests
**As a** QA engineer
**I want to** run API tests individually or as a collection
**So that** I can validate API behavior and catch regressions

**Acceptance Criteria:**
- [ ] Run single request with response viewer
- [ ] Chain requests — extract values from response into next request
- [ ] Bulk run entire collection
- [ ] Pass/fail report with details per request
- [ ] Response time tracking
- [ ] Auto-file Jira bug on assertion failure with request/response

**Story Points:** 13
**Priority:** P0
**Linked Requirements:** API-004, API-006, API-007, ABF-001, ABF-002, ABF-003

---

## Epic 10: Auto Bug Filing Engine (Phase 2)

### US-10.1: Automatic Bug Creation on Test Failure
**As a** QA engineer
**I want** the system to auto-create Jira bugs when any test fails
**So that** no failure goes untracked

**Acceptance Criteria:**
- [ ] Triggers from: API runner, Web runner, Mobile runner, Security scanner
- [ ] Captures: test name, error, stack trace, environment, timestamp
- [ ] Attaches: screenshot (UI/mobile), request/response (API)
- [ ] Auto-sets priority based on test severity
- [ ] Auto-labels: auto-filed, module, test-type
- [ ] Duplicate detection — checks existing open bugs before filing
- [ ] Links bug to test case and test run
- [ ] Configurable rules: which failures trigger auto-filing

**Story Points:** 13
**Priority:** P0
**Linked Requirements:** ABF-001 through ABF-009

---

## Epic 11: Web UI Test Runner (Phase 3)

### US-11.1: Run Playwright Tests
**As a** QA engineer
**I want to** write and run Playwright tests against any web application
**So that** I can automate browser-based testing for React, Angular, or any web app

**Acceptance Criteria:**
- [ ] In-browser test script editor with syntax highlighting
- [ ] Run against any URL (internal or external)
- [ ] Cross-browser: Chrome, Firefox, Safari, Edge
- [ ] Custom viewport and device emulation
- [ ] Screenshot on every failure
- [ ] DOM snapshot for debugging
- [ ] Video recording of test execution
- [ ] Real-time test output logs
- [ ] Auto-file Jira bug on failure with screenshot

**Story Points:** 13
**Priority:** P0
**Linked Requirements:** WEB-001 through WEB-006, WEB-012

---

### US-11.2: Visual Regression Testing
**As a** QA engineer
**I want to** compare screenshots across test runs
**So that** I can detect unintended UI changes

**Acceptance Criteria:**
- [ ] Capture baseline screenshots per test
- [ ] Pixel-diff comparison on subsequent runs
- [ ] Highlight changed regions
- [ ] Accept/reject changes to update baseline
- [ ] Threshold configuration (ignore < X% diff)
- [ ] Side-by-side comparison view

**Story Points:** 8
**Priority:** P1
**Linked Requirements:** WEB-007, WEB-008

---

### US-11.3: No-Code Test Recorder
**As a** manual QA tester
**I want to** record my browser actions and generate test scripts
**So that** I can create automated tests without writing code

**Acceptance Criteria:**
- [ ] Record clicks, typing, navigation, assertions
- [ ] Generate Playwright script from recording
- [ ] Edit generated script
- [ ] Replay recording as test

**Story Points:** 13
**Priority:** P2
**Linked Requirements:** WEB-009

---

## Epic 12: Mobile Test Runner — Appium (Phase 4)

### US-12.1: Configure and Connect Appium
**As a** QA engineer
**I want to** connect to an Appium server and manage devices
**So that** I can run automated tests on mobile apps

**Acceptance Criteria:**
- [ ] Configure Appium server URL (local or remote)
- [ ] List connected devices and emulators
- [ ] Upload .apk/.ipa to Firebase Storage
- [ ] Desired capabilities builder UI (platform, device, app path)
- [ ] Connection test and status indicator

**Story Points:** 8
**Priority:** P0
**Linked Requirements:** MOB-001, MOB-002, MOB-003, MOB-004

---

### US-12.2: Write and Execute Mobile Tests
**As a** QA engineer
**I want to** write and run Appium test scripts
**So that** I can automate testing of React Native and native mobile apps

**Acceptance Criteria:**
- [ ] Test script editor (WebDriverIO/JavaScript)
- [ ] Execute on selected device with real-time logs
- [ ] Gesture support: tap, swipe, pinch, long-press
- [ ] Screenshot on failure with device info
- [ ] Device log capture (logcat/syslog)
- [ ] Test history per device/OS version
- [ ] Auto-file Jira bug with screenshot, device info, logs

**Story Points:** 13
**Priority:** P0
**Linked Requirements:** MOB-005 through MOB-009, MOB-012

---

### US-12.3: Cloud Device Farm
**As a** QA lead
**I want to** run mobile tests on cloud device farms
**So that** I can test across devices without owning them all

**Acceptance Criteria:**
- [ ] BrowserStack integration
- [ ] Sauce Labs integration
- [ ] Parallel execution across multiple devices
- [ ] Device matrix results view

**Story Points:** 8
**Priority:** P2
**Linked Requirements:** MOB-010, MOB-011

---

## Epic 13: Security Scanner (Phase 5)

### US-13.1: OWASP Security Scan
**As a** QA/security engineer
**I want to** run automated security scans against web apps and APIs
**So that** I can identify vulnerabilities before production

**Acceptance Criteria:**
- [ ] OWASP Top 10 automated scan against any URL
- [ ] SQL injection detection on forms and API params
- [ ] XSS detection (reflected and stored)
- [ ] CSRF vulnerability detection
- [ ] Severity classification: Critical/High/Medium/Low
- [ ] Auto-file Jira bug for Critical/High findings

**Story Points:** 13
**Priority:** P0
**Linked Requirements:** SEC-101, SEC-104, SEC-105, SEC-108, SEC-109, SEC-111

---

### US-13.2: Infrastructure Security Checks
**As a** DevOps/QA engineer
**I want to** check server security configuration
**So that** I can ensure proper security headers, SSL, and port security

**Acceptance Criteria:**
- [ ] HTTP security header analysis (CORS, CSP, HSTS, X-Frame)
- [ ] SSL/TLS certificate check (validity, protocol, cipher)
- [ ] Common port scanning
- [ ] Auth testing (brute force protection, token expiry)
- [ ] PDF/HTML security report generation

**Story Points:** 8
**Priority:** P1
**Linked Requirements:** SEC-102, SEC-103, SEC-106, SEC-107, SEC-110

---

## Epic 14: Unified QA Dashboard (Phase 5)

### US-14.1: QA Command Center
**As a** QA lead
**I want** a unified dashboard showing all test results
**So that** I have complete visibility into quality across all test types

**Acceptance Criteria:**
- [ ] Combined view: API + Web + Mobile + Security results
- [ ] Pass/fail trend charts over time (line/bar charts)
- [ ] Flaky test detection and flagging
- [ ] Test coverage matrix (tests → features/modules)
- [ ] Failure grouping by error type
- [ ] Auto-filed bug count per run/sprint
- [ ] Team and individual QA metrics
- [ ] Export to PDF/Confluence

**Story Points:** 13
**Priority:** P0
**Linked Requirements:** QAD-001 through QAD-008

---

## Epic 15: Performance & Load Testing (Phase 6)

### US-15.1: API Load Testing
**As a** QA engineer
**I want to** run load tests against any API
**So that** I can validate performance under expected and peak traffic

**Acceptance Criteria:**
- [ ] Configure: concurrent users, ramp-up time, duration
- [ ] k6 engine for load execution
- [ ] Real-time graphs: response time, throughput, error rate
- [ ] Threshold rules: fail if response > Xms or error rate > Y%
- [ ] Compare runs side-by-side across builds
- [ ] Auto-file bug on performance degradation
- [ ] Support stress, spike, and soak test patterns

**Story Points:** 13
**Priority:** P0
**Linked Requirements:** PERF-101 through PERF-110

---

### US-15.2: Web Performance Audit
**As a** QA engineer
**I want to** run Lighthouse audits on web pages
**So that** I can track Core Web Vitals and performance scores

**Acceptance Criteria:**
- [ ] Lighthouse audit: LCP, FID, CLS, TTI, Speed Index
- [ ] Performance score tracking over time
- [ ] Compare scores across builds/deployments
- [ ] Recommendations list from Lighthouse

**Story Points:** 5
**Priority:** P1
**Linked Requirements:** PERF-103

---

## Epic 16: Test Data Generator (Phase 7)

### US-16.1: Generate Test Data
**As a** QA engineer
**I want to** generate realistic fake test data
**So that** I can seed test environments without using production data

**Acceptance Criteria:**
- [ ] Generate: names, emails, addresses, phones, dates, UUIDs
- [ ] Schema-based: define JSON schema → matching data
- [ ] Bulk: generate 10 to 100K records
- [ ] Presets: user profiles, orders, products, transactions
- [ ] Export: JSON, CSV, SQL INSERT, Excel
- [ ] API seeding: POST data directly to any endpoint
- [ ] Multi-locale: EN, FR, DE, JP, etc.
- [ ] Relational data (foreign key relationships)

**Story Points:** 8
**Priority:** P0
**Linked Requirements:** TDG-001 through TDG-009

---

## Epic 17: Environment Manager (Phase 7)

### US-17.1: Manage Test Environments
**As a** QA lead
**I want to** register and monitor all environments
**So that** QA can quickly switch between dev/staging/UAT/prod

**Acceptance Criteria:**
- [ ] Register environments with URL, config, credentials
- [ ] Health dashboard: up/down/degraded per environment
- [ ] Quick switch in all test runners
- [ ] Config diff across environments
- [ ] Deploy tracker: which build on which env
- [ ] Access control: restrict prod to leads/admins

**Story Points:** 8
**Priority:** P0
**Linked Requirements:** ENV-001 through ENV-007

---

## Epic 18: Notification & Alerting Hub (Phase 8)

### US-18.1: Multi-Channel Notifications
**As a** QA team member
**I want to** receive notifications on test failures and events
**So that** I can respond quickly to quality issues

**Acceptance Criteria:**
- [ ] Channels: Slack, Teams, Email, Webhooks
- [ ] Event triggers: test failure, security vuln, build deployed
- [ ] In-app notification bell (real-time via Firestore)
- [ ] Digest mode: hourly/daily summary
- [ ] Escalation rules: critical bug unassigned > 4hrs → manager
- [ ] Custom rules: IF smoke fails → alert channel
- [ ] Per-user notification preferences
- [ ] Mute/snooze support

**Story Points:** 13
**Priority:** P0
**Linked Requirements:** NTF-001 through NTF-008

---

## Epic 19: CI/CD Pipeline Integration (Phase 9)

### US-19.1: Trigger Tests from CI/CD
**As a** DevOps/QA engineer
**I want to** trigger test runs from CI/CD pipelines
**So that** tests run automatically on every build/deploy

**Acceptance Criteria:**
- [ ] GitHub Actions integration (workflow action)
- [ ] Jenkins webhook trigger
- [ ] GitLab CI support
- [ ] REST API trigger for any CI tool
- [ ] Quality gate: block deploy if tests fail (webhook response)
- [ ] Link results to build/commit/PR
- [ ] Auto-post results as PR comment
- [ ] Pipeline dashboard: visualize test stages

**Story Points:** 13
**Priority:** P0
**Linked Requirements:** CICD-001 through CICD-009

---

## Epic 20: Accessibility Testing (Phase 10)

### US-20.1: WCAG Compliance Scanning
**As a** QA engineer
**I want to** scan web pages for accessibility violations
**So that** our product meets WCAG 2.1 AA standards

**Acceptance Criteria:**
- [ ] axe-core scanning against any URL
- [ ] Severity: Critical, Serious, Moderate, Minor
- [ ] Element highlighter on failing elements (screenshot overlay)
- [ ] WCAG compliance checklist (pass/fail per criterion)
- [ ] Color contrast checker
- [ ] Auto-file Jira bug for critical violations
- [ ] Accessibility score trending over time

**Story Points:** 8
**Priority:** P0
**Linked Requirements:** A11Y-001 through A11Y-008

---

## Epic 21: Log Analyzer (Phase 10)

### US-21.1: Application Log Analysis
**As a** QA engineer
**I want to** aggregate and search application logs
**So that** I can correlate errors with test failures and deployments

**Acceptance Criteria:**
- [ ] Connect to Cloud Logging, ELK, or file-based logs
- [ ] Error grouping by stack trace fingerprint
- [ ] Full-text search with severity/service/time filters
- [ ] Correlate errors to test runs and deployments
- [ ] Auto-file bug on new error patterns
- [ ] Alert rules: error spike > threshold → notify

**Story Points:** 8
**Priority:** P0
**Linked Requirements:** LOG-001 through LOG-006

---

## Epic 22: AI Test Case Generator (Phase 11)

### US-22.1: Generate Test Cases from Jira Stories
**As a** QA engineer
**I want** AI to auto-generate test cases from Jira user stories
**So that** I can create comprehensive test coverage faster

**Acceptance Criteria:**
- [ ] Select Jira story/epic → AI generates test cases
- [ ] Generates: title, preconditions, steps, expected results
- [ ] Covers: happy path, edge cases, negative scenarios
- [ ] Suggest missing test scenarios the QA might miss
- [ ] Editable before saving to test suite
- [ ] Bulk generate for multiple stories
- [ ] Configurable detail level (brief/standard/comprehensive)

**Story Points:** 13
**Priority:** P0
**Linked Requirements:** AI-001, AI-009, AI-010

---

### US-22.2: Generate Test Cases from API Specs
**As a** QA engineer
**I want** AI to generate test cases from Swagger/OpenAPI specs
**So that** every API endpoint has structured test coverage

**Acceptance Criteria:**
- [ ] Import Swagger/OpenAPI JSON/YAML
- [ ] AI generates test cases per endpoint (CRUD, auth, validation, edge cases)
- [ ] Includes boundary value analysis
- [ ] Generates negative test cases (invalid input, missing auth, wrong types)
- [ ] Export to test case management module

**Story Points:** 8
**Priority:** P0
**Linked Requirements:** AI-002

---

## Epic 23: AI Test Script Generator (Phase 11)

### US-23.1: Generate Playwright Test Scripts
**As a** QA engineer
**I want** AI to generate Playwright test scripts from test cases or URLs
**So that** I can automate web UI testing without writing scripts from scratch

**Acceptance Criteria:**
- [ ] Input: test case steps OR target URL + test description
- [ ] AI generates complete Playwright test script
- [ ] Language options: JavaScript, TypeScript
- [ ] Includes: selectors, assertions, waits, error handling
- [ ] Preview in Monaco editor before saving
- [ ] One-click run generated script
- [ ] Regenerate with different approach/selectors

**Story Points:** 13
**Priority:** P0
**Linked Requirements:** AI-003, AI-013, AI-014

---

### US-23.2: Generate API Test Scripts
**As a** QA engineer
**I want** AI to generate API test scripts from Swagger or Postman collections
**So that** I can quickly build comprehensive API test suites

**Acceptance Criteria:**
- [ ] Input: Swagger spec, Postman collection, or manual description
- [ ] Generates: request config, assertions, chained flows
- [ ] Covers: status codes, response schema, error cases, auth flows
- [ ] Outputs directly into API Test Runner module
- [ ] Language options: JavaScript, TypeScript, Python

**Story Points:** 8
**Priority:** P0
**Linked Requirements:** AI-005, AI-013

---

## Epic 24: AI Appium Script Generator (Phase 11)

### US-24.1: Generate Appium Test Scripts
**As a** QA engineer
**I want** AI to generate Appium/WebDriverIO scripts for mobile testing
**So that** I can automate React Native and native app testing faster

**Acceptance Criteria:**
- [ ] Input: test case steps + app type (iOS/Android/React Native)
- [ ] AI generates WebDriverIO/Appium script with selectors
- [ ] Includes: gestures (swipe, tap, long-press), waits, assertions
- [ ] Platform-specific handling (Android vs iOS selectors)
- [ ] Generates desired capabilities boilerplate
- [ ] Preview + edit in Monaco editor
- [ ] One-click execute on connected device
- [ ] Language options: JavaScript, TypeScript, Python, Java

**Story Points:** 13
**Priority:** P0
**Linked Requirements:** AI-004, AI-013, AI-014

---

## Epic 25: AI Release Notes Generator (Phase 11)

### US-25.1: Auto-Generate Release Notes
**As a** product/QA manager
**I want** AI to generate release notes from Jira sprint/version tickets
**So that** release documentation is always complete and consistent

**Acceptance Criteria:**
- [ ] Select Jira sprint, version, or date range
- [ ] AI fetches all resolved tickets and categorizes them
- [ ] Categories: New Features, Improvements, Bug Fixes, Breaking Changes, Known Issues
- [ ] Auto-summarize each ticket into user-friendly language
- [ ] Customizable template (sections, tone, detail level)
- [ ] Output formats: Markdown, HTML, Confluence page, Slack message
- [ ] Include ticket links, assignees, labels
- [ ] Preview and edit before publishing
- [ ] Publish directly to Confluence or Slack

**Story Points:** 13
**Priority:** P0
**Linked Requirements:** AI-006, AI-007, AI-008

---

### US-25.2: BDD/Gherkin Feature File Generator
**As a** QA engineer
**I want** AI to generate BDD feature files from requirements
**So that** I can adopt behavior-driven testing without manual writing

**Acceptance Criteria:**
- [ ] Input: Jira story or plain text requirement
- [ ] AI generates Gherkin feature file (Given/When/Then)
- [ ] Multiple scenarios per feature (happy, sad, edge)
- [ ] Export as .feature file
- [ ] Edit in Monaco editor

**Story Points:** 8
**Priority:** P2
**Linked Requirements:** AI-012

---

## Epic 26: Contract Testing — Pact (Phase 12)

### US-26.1: Consumer-Driven Contract Testing
**As a** QA/backend engineer
**I want to** define and verify API contracts between services
**So that** frontend-backend integration doesn't break silently

**Acceptance Criteria:**
- [ ] Define consumer expectations (request/response contracts)
- [ ] Verify provider compliance against contracts
- [ ] Contract versioning and history
- [ ] Breaking change detection with alerts
- [ ] Visual contract diff viewer
- [ ] Integration with CI/CD quality gates

**Story Points:** 13
**Priority:** P0
**Linked Requirements:** PACT-001 through PACT-006

---

## Epic 27: Chaos Engineering (Phase 13)

### US-27.1: Fault Injection Testing
**As a** QA/SRE engineer
**I want to** inject failures into services
**So that** I can validate system resilience and recovery

**Acceptance Criteria:**
- [ ] Inject: network latency, HTTP errors (500/503/timeout)
- [ ] CPU/memory stress injection
- [ ] Dependency failure simulation
- [ ] Blast radius controls (limit scope of chaos)
- [ ] Schedule chaos experiments
- [ ] Automated recovery validation (did the system heal?)
- [ ] Experiment report: system behavior during chaos
- [ ] Auto-file bug if recovery fails

**Story Points:** 13
**Priority:** P0
**Linked Requirements:** CHAOS-001 through CHAOS-008

---

## Epic 28: Database Testing (Phase 14)

### US-28.1: Database Validation & Testing
**As a** QA engineer
**I want to** test databases directly
**So that** I can verify data integrity, migrations, and queries

**Acceptance Criteria:**
- [ ] Connect to: PostgreSQL, MySQL, MongoDB, Firestore
- [ ] SQL query execution with result validation
- [ ] Schema migration testing (before/after diff)
- [ ] Data integrity: constraints, foreign keys, uniqueness
- [ ] Snapshot comparison across environments
- [ ] Slow query detection
- [ ] Seed database with test data (from Test Data Generator)
- [ ] Auto-file bug on integrity violations

**Story Points:** 13
**Priority:** P0
**Linked Requirements:** DB-001 through DB-008

---

## Epic 29: Snapshot Testing (Phase 14)

### US-29.1: API & UI Snapshot Comparison
**As a** QA engineer
**I want to** capture and compare snapshots across builds
**So that** I can detect unexpected changes in API responses or UI components

**Acceptance Criteria:**
- [ ] Capture API response snapshots (JSON)
- [ ] UI component snapshot capture
- [ ] Diff viewer with inline highlighted changes
- [ ] Compare across versions/builds
- [ ] Auto-update snapshots with approval
- [ ] Fail CI/CD on unexpected diff

**Story Points:** 8
**Priority:** P0
**Linked Requirements:** SNAP-001 through SNAP-006

---

## Epic 30: Test Flake Analyzer (Phase 15)

### US-30.1: Flaky Test Detection & Management
**As a** QA lead
**I want to** identify and manage flaky tests
**So that** unreliable tests don't block releases or hide real failures

**Acceptance Criteria:**
- [ ] Track pass/fail history per test across all runs
- [ ] Flake score: flip frequency percentage
- [ ] Auto-quarantine flaky tests (exclude from quality gate)
- [ ] Root cause suggestions (timing, env, data-dependent)
- [ ] Flake trend dashboard
- [ ] Alert on newly flaky tests

**Story Points:** 8
**Priority:** P0
**Linked Requirements:** FLAKE-001 through FLAKE-006

---

## Epic 31: Multi-Region Testing (Phase 15)

### US-31.1: Geographic Test Execution
**As a** QA engineer
**I want to** run tests from multiple regions
**So that** I can validate performance and content across geographies

**Acceptance Criteria:**
- [ ] Execute from: US, EU, Asia, Australia (Cloud Run multi-region)
- [ ] Latency comparison dashboard across regions
- [ ] CDN validation (content from nearest edge)
- [ ] Geo-specific content verification
- [ ] Region health matrix

**Story Points:** 8
**Priority:** P0
**Linked Requirements:** REGION-001 through REGION-005

---

## Epic 32: Compliance Dashboard (Phase 16)

### US-32.1: Compliance Tracking & Reporting
**As a** QA/compliance manager
**I want to** track compliance status across standards
**So that** we're audit-ready at any time

**Acceptance Criteria:**
- [ ] SOC2 compliance checklist with evidence tracking
- [ ] GDPR compliance validation
- [ ] Compliance audit trail
- [ ] Auto-link test evidence to compliance requirements
- [ ] Compliance score and trend tracking
- [ ] Export compliance report for auditors

**Story Points:** 13
**Priority:** P0
**Linked Requirements:** COMP-001 through COMP-007

---

## Epic 33: Test Coverage Mapper (Phase 16)

### US-33.1: Code Coverage to Test Case Mapping
**As a** QA lead
**I want to** map code coverage to test cases
**So that** I can identify testing gaps

**Acceptance Criteria:**
- [ ] Import: Istanbul/NYC (JS/TS), JaCoCo (Java) coverage reports
- [ ] Map coverage data to test cases
- [ ] Identify uncovered code paths
- [ ] Coverage trend over time
- [ ] Threshold enforcement (fail if below X%)
- [ ] AI suggestion: generate tests for uncovered paths

**Story Points:** 8
**Priority:** P0
**Linked Requirements:** COV-001 through COV-006

---

## Epic 34: Release Readiness Gate (Phase 16)

### US-34.1: Go/No-Go Release Decision
**As a** release manager
**I want** an automated readiness assessment
**So that** releases only ship when quality criteria are met

**Acceptance Criteria:**
- [ ] Aggregate: test pass %, code coverage %, security vulns, perf metrics
- [ ] Configurable criteria per project/release
- [ ] Visual readiness scorecard (green/yellow/red)
- [ ] Historical release readiness tracking
- [ ] Auto-generate release notes from passed gate (AI)
- [ ] Approval workflow: QA lead, PM, DevOps sign-off
- [ ] Block deployment via CI/CD if gate fails

**Story Points:** 13
**Priority:** P0
**Linked Requirements:** RRG-001 through RRG-007

---

## Epic 35: No-Code Test Recorder (Addon)

### US-35.1: Visual Step Builder
**As a** QA engineer without coding experience
**I want to** build test steps visually using a point-and-click interface
**So that** I can create automated tests without writing code

**Acceptance Criteria:**
- [ ] Visual step builder with drag-and-drop reordering
- [ ] Action types: Click, Type, Navigate, Wait, Assert
- [ ] Element selector field with CSS/XPath support
- [ ] Optional value field per action
- [ ] Step preview with human-readable descriptions
- [ ] Duplicate and delete individual steps

**Story Points:** 8
**Priority:** P1
**Linked Requirements:** ADD-001, ADD-002

---

### US-35.2: Script Generation & Save
**As a** QA engineer
**I want to** generate runnable Playwright or Appium scripts from my recorded steps
**So that** I can execute them in the Web/Mobile test runners

**Acceptance Criteria:**
- [ ] Generate Playwright script (JavaScript/TypeScript) from steps
- [ ] Generate Appium/WDIO script from steps
- [ ] Code preview with syntax highlighting
- [ ] Save directly to Web Runner or Mobile Runner modules
- [ ] Copy script to clipboard

**Story Points:** 8
**Priority:** P1
**Linked Requirements:** ADD-003, ADD-004

---

## Epic 36: Test Scheduling (Addon)

### US-36.1: Schedule Test Runs
**As a** QA lead
**I want to** schedule recurring test runs on a cron schedule
**So that** tests run automatically without manual intervention

**Acceptance Criteria:**
- [ ] Schedule API, Web, Security, and Accessibility tests
- [ ] Cron expression builder UI (visual picker for time/day/frequency)
- [ ] Preview next 5 execution times
- [ ] Enable/disable individual schedules
- [ ] Manual "Run Now" button per schedule

**Story Points:** 8
**Priority:** P1
**Linked Requirements:** ADD-010, ADD-011, ADD-012

---

### US-36.2: Execution History
**As a** QA lead
**I want to** view the history of all scheduled test executions
**So that** I can track reliability and performance over time

**Acceptance Criteria:**
- [ ] List all past executions with timestamp, status, and duration
- [ ] Filter by schedule, status, and date range
- [ ] Link to detailed test results
- [ ] Average pass rate and duration metrics

**Story Points:** 5
**Priority:** P1
**Linked Requirements:** ADD-013

---

## Epic 37: Team Management (Addon)

### US-37.1: Team Invitations & Roles
**As an** admin
**I want to** invite team members and assign roles
**So that** my team can collaborate on the platform with appropriate permissions

**Acceptance Criteria:**
- [ ] Invite members via email address
- [ ] Role assignment: Admin, Manager, User
- [ ] Pending invitations list with resend/revoke actions
- [ ] Team members list with role badges
- [ ] Role-based access enforcement across all modules
- [ ] Team settings page (team name, defaults, timezone)

**Story Points:** 13
**Priority:** P1
**Linked Requirements:** ADD-020, ADD-021, ADD-022

---

## Epic 38: Multi-Project Support (Addon)

### US-38.1: Project CRUD & Switching
**As a** user working across multiple products
**I want to** create separate projects and switch between them
**So that** test data and configurations are isolated per product

**Acceptance Criteria:**
- [ ] Create new projects with name and description
- [ ] Project switcher in the header/sidebar
- [ ] Per-project Jira configuration (base URL, credentials)
- [ ] All data (tests, runs, scans) scoped to active project
- [ ] Default project selection on login
- [ ] Project deletion with confirmation (admin only)

**Story Points:** 13
**Priority:** P1
**Linked Requirements:** ADD-030, ADD-031, ADD-032

---

## Epic 39: PDF Report Generator (Addon)

### US-39.1: Generate & Download PDF Reports
**As a** QA lead or manager
**I want to** generate branded PDF reports for different test activities
**So that** I can share professional reports with stakeholders

**Acceptance Criteria:**
- [ ] Report types: QA Summary, Security Scan, Performance, Release Notes
- [ ] Date range and project filters
- [ ] Branded HTML preview with company logo placeholder
- [ ] Print-optimized CSS with headers, footers, and page breaks
- [ ] Download via browser print dialog (Save as PDF)
- [ ] Include charts, tables, and summary metrics

**Story Points:** 8
**Priority:** P1
**Linked Requirements:** ADD-040, ADD-041, ADD-042

---

## Epic 40: Custom Dashboard Builder (Addon)

### US-40.1: Drag-and-Drop Dashboard
**As a** user
**I want to** build custom dashboards by dragging and dropping widgets
**So that** I can create personalized views of the data I care about

**Acceptance Criteria:**
- [ ] Widget library: charts, metric cards, tables, status indicators
- [ ] Drag-and-drop grid layout (responsive)
- [ ] Configurable data source per widget (test results, coverage, security, etc.)
- [ ] Save and load custom layouts
- [ ] Share layouts with team members
- [ ] Default layouts for common roles (QA, Manager, DevOps)

**Story Points:** 13
**Priority:** P2
**Linked Requirements:** ADD-050, ADD-051, ADD-052

---

## Epic 41: Webhook Management (Addon)

### US-41.1: Incoming & Outgoing Webhooks
**As a** platform admin
**I want to** configure webhooks to integrate with external systems
**So that** events can flow in and out of the platform automatically

**Acceptance Criteria:**
- [ ] Create incoming webhook endpoints with unique URLs
- [ ] Configure outgoing webhooks (URL, events, headers, secret)
- [ ] Event selector: test failure, scan complete, gate evaluated, etc.
- [ ] Webhook delivery history with status codes and response times
- [ ] Manual test/retry button per webhook
- [ ] Payload preview (JSON) for each event type

**Story Points:** 8
**Priority:** P2
**Linked Requirements:** ADD-060, ADD-061, ADD-062

---

## Epic 42: API Usage Analytics (Addon)

### US-42.1: API Metrics Dashboard
**As a** platform admin
**I want to** monitor API usage patterns and performance
**So that** I can identify bottlenecks and plan capacity

**Acceptance Criteria:**
- [ ] API call volume tracking (hourly, daily, weekly)
- [ ] Response time distribution charts (p50, p95, p99)
- [ ] Error rate by endpoint and status code
- [ ] Per-endpoint performance breakdown table
- [ ] Top consumers (by user or project)
- [ ] Date range filter and auto-refresh

**Story Points:** 8
**Priority:** P2
**Linked Requirements:** ADD-070, ADD-071, ADD-072

---

## Epic 43: Data Masking (Addon)

### US-43.1: PII Data Masking Rules
**As a** QA engineer handling sensitive data
**I want to** define masking rules for PII fields in test data
**So that** sensitive information is protected during testing

**Acceptance Criteria:**
- [ ] Pattern matching for common PII: email, SSN, phone, credit card, name
- [ ] Custom regex pattern support
- [ ] Masking types: full mask, partial mask, hash, redact
- [ ] Preview masked output before applying
- [ ] Apply masking to Test Data Generator output
- [ ] Masking rules saved per project

**Story Points:** 8
**Priority:** P2
**Linked Requirements:** ADD-080, ADD-081, ADD-082

---

## Story Map Summary (v5.0 — Full QA Platform + AI Intelligence + Addons)

| Epic | Phase | Stories | SP |
|------|-------|---------|----|
| Auth & Access (Firebase) | 1 | 5 | 18 |
| Setup & Integration | 1 | 5 | 31 |
| Excel to Jira | 1 | 4 | 29 |
| Teams to Jira | 1 | 4 | 26 |
| Confluence Reporting | 1 | 3 | 21 |
| Audit & Tracking | 1 | 2 | 8 |
| Dashboard (Ticketing) | 1 | 1 | 8 |
| Test Case Management | 2 | 3 | 21 |
| API Test Runner | 2 | 2 | 26 |
| Auto Bug Filing Engine | 2 | 1 | 13 |
| Web UI Test Runner | 3 | 3 | 34 |
| Mobile Test Runner (Appium) | 4 | 3 | 29 |
| Security Scanner | 5 | 2 | 21 |
| Unified QA Dashboard | 5 | 1 | 13 |
| Performance & Load Testing | 6 | 2 | 18 |
| Test Data Generator | 7 | 1 | 8 |
| Environment Manager | 7 | 1 | 8 |
| Notification Hub | 8 | 1 | 13 |
| CI/CD Integration | 9 | 1 | 13 |
| Accessibility Testing | 10 | 1 | 8 |
| Log Analyzer | 10 | 1 | 8 |
| **AI Test Case Generator** | **11** | **2** | **21** |
| **AI Test Script Generator** | **11** | **2** | **21** |
| **AI Appium Script Generator** | **11** | **1** | **13** |
| **AI Release Notes Generator** | **11** | **2** | **21** |
| **Contract Testing (Pact)** | **12** | **1** | **13** |
| **Chaos Engineering** | **13** | **1** | **13** |
| **Database Testing** | **14** | **1** | **13** |
| **Snapshot Testing** | **14** | **1** | **8** |
| **Test Flake Analyzer** | **15** | **1** | **8** |
| **Multi-Region Testing** | **15** | **1** | **8** |
| **Compliance Dashboard** | **16** | **1** | **13** |
| **Test Coverage Mapper** | **16** | **1** | **8** |
| **Release Readiness Gate** | **16** | **1** | **13** |
| **No-Code Test Recorder** | **Addon** | **2** | **16** |
| **Test Scheduling (Cron)** | **Addon** | **2** | **13** |
| **Team Management** | **Addon** | **1** | **13** |
| **Multi-Project Support** | **Addon** | **1** | **13** |
| **PDF Report Generator** | **Addon** | **1** | **8** |
| **Custom Dashboard Builder** | **Addon** | **1** | **13** |
| **Webhook Management** | **Addon** | **1** | **8** |
| **API Usage Analytics** | **Addon** | **1** | **8** |
| **Data Masking** | **Addon** | **1** | **8** |
| **Grand Total** | **1-16 + Addons** | **74** | **718** |
