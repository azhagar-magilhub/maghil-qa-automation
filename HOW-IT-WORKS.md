# How It Works — QA Automation & Ticketing Platform

## Quick Start Guide

### Step 1: Register & Login
1. Go to **https://maghil-qa.web.app/register**
2. Enter your full name, email, and password
3. Click **Create Account**
4. You'll be redirected to the Dashboard

### Step 2: Configure Integrations (Setup Wizard)
1. Navigate to **Setup** from the sidebar (or `/setup`)
2. Follow the 5-step wizard:
   - **Welcome** — Overview of what you'll configure
   - **Jira** — Enter your Jira Base URL, email, and API token → Click "Test Connection"
   - **Confluence** — Enter Confluence details (can use same credentials as Jira) → Test or Skip
   - **Microsoft Teams** — Enter Azure AD Tenant ID, Client ID, Client Secret → Test or Skip
   - **Complete** — Summary of connected integrations
3. You can update integrations anytime from **Settings** (`/settings`)

> **Where to find your Jira API Token:** https://id.atlassian.com/manage-profile/security/api-tokens

---

## Core Features (Phase 1)

### Excel to Jira — Bulk Ticket Creation
1. Go to **Excel Upload** (`/excel`)
2. **Upload:** Drag-and-drop your .xlsx, .xls, or .csv file
3. **Map:** Map each Excel column to a Jira field (Summary, Description, Priority, Labels, Assignee, etc.)
4. **Validate:** Preview all rows — green check for valid, red X for invalid with error details
5. **Create:** Select Jira project and issue type → Click "Create Tickets"
6. Watch real-time progress as tickets are created in Jira
7. Click any Jira ticket link to view it directly

### Teams Chat to Jira — Message Conversion
1. Go to **Teams Chat** (`/teams`)
2. **Browse:** Select a Team and Channel from the left panel
3. **Filter:** Set date range and keyword filters → Click "Fetch Messages"
4. **Select:** Check the messages you want to convert
5. **Convert:** Choose Jira project and issue type → Click "Convert to Tickets"
6. Messages become structured Jira tickets with sender, timestamp, and content

### Confluence Reports — Auto-Publish
1. Go to **Reports** (`/reports`)
2. Select a date range to see all tickets created in that period
3. Review the summary table (Jira Key, Summary, Type, Priority, Source)
4. Click **Publish to Confluence**
5. Select space, enter page title, choose create new or append
6. Report is published with formatted tables and ticket links

### Dashboard — Real-Time Metrics
- **Metric cards:** Total Tickets, Excel Uploads, Teams Imports, Reports Published
- **Charts:** Tickets by Source (bar), Tickets by Status (pie)
- **Activity Timeline:** Last 10 actions across the platform
- **Integration Health:** Green/Red status for Jira, Confluence, Teams
- **Quick Actions:** One-click buttons to Upload Excel, Browse Teams, Generate Report

### Audit Log — Full Traceability
- Every action is logged: ticket creation, file uploads, API calls, config changes
- **Search** by keyword, **filter** by status (Success/Failure) and action type
- **Export** filtered results as CSV for compliance

---

## QA Testing Features (Phase 2-5)

### Test Case Management (`/test-cases`)
1. **Create Suites:** Organize test cases into folders/suites
2. **Write Cases:** Title, preconditions, steps with expected results, priority, type
3. **Tag & Link:** Add tags, link to Jira stories
4. **Create Test Runs:** Select a suite → assign to QA → name the run
5. **Execute:** Mark each case as Pass/Fail/Blocked/Skipped with notes
6. **Auto-File Bugs:** Failed cases automatically create Jira bugs with full context

### API Test Runner (`/api-runner`)
1. **Create Collection:** Organize API requests into folders
2. **Build Requests:** Method, URL, headers, body, auth (Bearer/Basic/API Key)
3. **Add Assertions:** Status code, response body (JSONPath), headers, response time
4. **Chain Requests:** Extract values from responses → inject into next request
5. **Run Collection:** Execute all requests sequentially with real-time progress
6. **Import:** Postman Collection v2.1 or Swagger/OpenAPI specs
7. **Auto-File Bugs:** Failed assertions create Jira bugs automatically

### Web UI Test Runner (`/web-runner`)
1. **Write Script:** Playwright test script in the dark code editor
2. **Configure:** Target URL, browser (Chrome/Firefox/Safari/Edge), viewport
3. **Run Test:** Real Playwright execution with Chromium
4. **View Results:** Status, duration, screenshots, console errors
5. **Visual Regression:** Compare screenshots across runs (baseline diff)

### Mobile Test Runner (`/mobile-runner`)
1. **Select Device:** Choose from connected devices/emulators
2. **Upload App:** Drag-drop .apk or .ipa file
3. **Set Capabilities:** Platform, device name, automation engine
4. **Write Script:** WebDriverIO/Appium test script
5. **Run on Device:** Real Appium execution with screenshots and device logs

### Security Scanner (`/security`)
1. **Enter URL:** Target application URL
2. **Choose Scan Type:** Full Scan, Headers Only, or SSL Only
3. **View Results:**
   - Severity summary cards (Critical/High/Medium/Low)
   - Detailed findings with remediation guidance
   - HTTP header analysis (HSTS, CSP, X-Frame-Options, etc.)
   - SSL/TLS certificate check (validity, protocol, cipher)
4. **Auto-File Bugs:** Critical/High findings → Jira bugs

### QA Dashboard (`/qa-dashboard`)
- Unified view across API, Web, Mobile, and Security tests
- Pass/fail trend charts, test type distribution
- Flaky test detection, failure grouping
- Auto-filed bug count per run

---

## Platform Features (Phase 6-10)

### Test Data Generator (`/test-data`)
1. **Build Schema:** Add fields with types (name, email, phone, address, UUID, etc.)
2. **Use Presets:** User Profile, Order, Product, Transaction
3. **Generate:** Set count (10 to 100K records) → Click Generate
4. **Export:** JSON, CSV, or SQL INSERT format
5. **Seed API:** POST generated data directly to any endpoint

### Environment Manager (`/environments`)
1. **Register:** Add dev, staging, UAT, prod environments with URLs and variables
2. **Monitor Health:** Green/Red status indicators, response time
3. **Compare:** Side-by-side config diff between any two environments
4. **Quick Switch:** Switch environment across all test runners

### Notifications (`/notifications`)
- **Channels:** In-App, Slack, Teams, Email webhooks
- **Events:** Test failure, security vulnerability, build deployed, escalation
- **Alert Rules:** IF [condition] THEN [action] custom rules
- **History:** Full notification log

### CI/CD Integration (`/cicd`)
1. **Trigger:** Select test collection → trigger from CI pipeline
2. **Webhook URL:** Configure in GitHub Actions / Jenkins / GitLab CI
3. **Quality Gate:** Set thresholds (min pass rate %, max critical vulns)
4. **Gate Check:** CI pipeline queries gate status → blocks deploy if tests fail
5. **GitHub Action YAML:** Auto-generated workflow configuration

### Accessibility Testing (`/accessibility`)
1. **Scan URL:** Enter target page URL → Run WCAG scan
2. **Review Findings:** Severity badges, element, issue, WCAG criterion, remediation
3. **Contrast Checker:** Two color pickers → shows ratio and AA/AAA pass/fail
4. **Auto-File Bugs:** Critical accessibility violations → Jira bugs

### Log Analyzer (`/log-analyzer`)
1. **Connect Source:** Cloud Logging, ELK, or file-based logs
2. **Search:** Full-text search with severity, date range, service filters
3. **Error Groups:** Errors grouped by fingerprint with occurrence count
4. **Alert Rules:** Error spike > threshold → notify team

---

## AI & Intelligence Features (Phase 11-13)

### AI Hub (`/ai-hub`)

**Test Case Generator:**
1. Select source: Jira Story or API Spec
2. Paste content → Choose detail level (Brief/Standard/Comprehensive)
3. Click **Generate** → AI creates test cases with steps and expected results
4. Review and save to Test Case Management

**Script Generator:**
1. Choose type: Playwright, Appium, or API
2. Describe the test or paste a test case
3. Select language: JavaScript, TypeScript, Python, or Java
4. Click **Generate** → AI writes the complete test script
5. Copy or save directly

**Release Notes Generator:**
1. Paste ticket list or select date range
2. Choose template (Standard/Detailed/Changelog) and format (Markdown/HTML/Confluence)
3. Click **Generate** → AI categorizes tickets and writes user-friendly notes
4. Publish directly to Confluence or Slack

**BDD/Gherkin Generator:**
1. Paste requirement text
2. Click **Generate** → AI creates Given/When/Then feature file
3. Download as .feature file

### Contract Testing (`/contracts`)
1. **Define Contract:** Consumer name, provider name, endpoint, expected request/response
2. **Verify:** Click Verify → system checks provider compliance
3. **View Diff:** Compare contract versions, detect breaking changes
4. **CI/CD Gate:** Block deploys on contract violations

### Chaos Engineering (`/chaos`)
1. **Build Experiment:** Target URL, fault type (Latency/HTTP Error/CPU Stress/Memory/Dependency)
2. **Configure:** Duration, intensity, blast radius controls
3. **Run:** Confirm safety dialog → Execute experiment
4. **Monitor:** Real-time response time and error rate graphs
5. **Results:** Recovery time, errors during chaos, system behavior report

---

## Release Features (Phase 14-16)

### Database Testing (`/db-testing`)
1. **Connect:** PostgreSQL, MySQL, or MongoDB credentials
2. **Execute Queries:** SQL editor with results table
3. **Schema Diff:** Compare schemas across environments
4. **Integrity Checks:** Constraints, foreign keys, uniqueness validation

### Snapshot Testing (`/snapshots`)
1. **Capture:** API response or UI component snapshot
2. **Compare:** Deep-diff against baseline (added/removed/changed)
3. **Accept:** Promote current snapshot as new baseline

### Flake Analyzer (`/flake-analyzer`)
- **Flake Score:** Track pass/fail history per test
- **Quarantine:** Exclude flaky tests from quality gates
- **Root Cause:** Suggestions for timing, environment, or data issues
- **Trend Chart:** Flake score over time

### Compliance Dashboard (`/compliance`)
- **SOC2 / GDPR** checklist with pass/fail/pending status
- Evidence linking (test results → compliance requirements)
- Compliance score percentage
- Export audit report for external auditors

### Coverage Mapper (`/coverage`)
1. **Import:** Istanbul/NYC JSON or JaCoCo XML coverage reports
2. **View:** Statements, branches, functions, lines coverage percentages
3. **File Tree:** Color-coded coverage per file (green >80%, yellow 50-80%, red <50%)
4. **Gaps:** Uncovered code paths listed with "Link Test Case" action

### Release Readiness Gate (`/release-gate`)
1. **Configure Criteria:** Min test pass %, min coverage, max critical vulns, max P95 latency
2. **Evaluate:** Click → system aggregates all quality signals
3. **Scorecard:** Green/Yellow/Red per criterion with overall PASS/FAIL verdict
4. **Approval Workflow:** QA Lead, PM, DevOps sign-off
5. **Auto Release Notes:** AI generates notes when gate passes

---

## Platform Addons

### No-Code Test Recorder (`/test-recorder`)
1. **Enter Target URL:** Provide the URL of the web page to test
2. **Start Recording:** Click Record to begin capturing user interactions
3. **Build Steps:** Each interaction becomes a test step (Click, Type, Navigate, Wait, Assert)
4. **Reorder Steps:** Drag and drop steps to adjust execution order
5. **Edit Selectors:** Refine element selectors (CSS/XPath) per step
6. **Generate Script:** Click Generate to produce a Playwright or Appium script
7. **Preview Code:** Review the generated test script with syntax highlighting
8. **Save to Runner:** Save directly to Web Runner or Mobile Runner for execution

### Test Scheduling (`/schedules`)
1. **Create Schedule:** Click New Schedule and name it
2. **Select Test:** Choose an API collection, Web test, Security scan, or Accessibility scan
3. **Set Frequency:** Use the cron builder to pick time, day, and recurrence pattern
4. **Preview Timing:** See the next 5 scheduled execution times
5. **Enable/Disable:** Toggle schedules on or off as needed
6. **Run Now:** Click the manual trigger button for immediate execution
7. **View History:** Browse past executions with status, duration, and result links

### Team Management (`/team`)
1. **Create Team:** Set team name, timezone, and default settings
2. **Invite Members:** Enter email addresses to send invitations
3. **Assign Roles:** Set each member as Admin, Manager, or User
4. **Manage Invitations:** View pending invites with resend or revoke options
5. **Configure Defaults:** Set team-wide defaults for Jira project, notification preferences
6. **Role Enforcement:** Permissions are enforced across all platform modules

### Multi-Project Support (`/projects`)
1. **Create Project:** Click New Project, enter name and description
2. **Switch Projects:** Use the project switcher dropdown in the header
3. **Configure Jira:** Each project can have its own Jira base URL and credentials
4. **Data Isolation:** All tests, scans, and results are scoped to the active project
5. **Set Default:** Mark a project as default for automatic selection on login
6. **Delete Project:** Admin-only action with confirmation dialog

### PDF Report Generator (`/pdf-reports`)
1. **Select Report Type:** Choose from QA Summary, Security Scan, Performance, or Release
2. **Set Filters:** Pick date range, project, and data scope
3. **Configure Options:** Add project name, company branding, and custom notes
4. **Preview Report:** Review the formatted HTML report in the browser
5. **Download PDF:** Click Download to open the browser print dialog, then Save as PDF
6. **Share:** Print-optimized CSS ensures headers, footers, and page breaks render correctly

### Custom Dashboard Builder (`/custom-dashboard`)
1. **Open Builder:** Navigate to the custom dashboard page
2. **Add Widgets:** Choose from metric cards, charts, tables, and status indicators
3. **Configure Data:** Select data source per widget (test results, coverage, security, etc.)
4. **Drag & Drop:** Arrange widgets on the responsive grid layout
5. **Resize Widgets:** Adjust widget size by dragging edges
6. **Save Layout:** Name and save your custom layout for future use
7. **Load Layout:** Switch between saved layouts or use role-based defaults

### Webhook Management (`/webhooks`)
1. **Create Incoming Webhook:** Generate a unique URL endpoint for external systems to POST to
2. **Create Outgoing Webhook:** Configure target URL, events to trigger on, and authentication
3. **Select Events:** Choose from: Test Failure, Scan Complete, Gate Evaluated, Bug Filed, etc.
4. **Set Headers/Secret:** Configure custom headers or HMAC signing secret for security
5. **Test Webhook:** Click Test to send a sample payload and verify delivery
6. **View History:** Browse delivery history with status codes, response times, and payloads
7. **Retry Failures:** Re-send failed deliveries with one click

### API Usage Analytics (`/api-analytics`)
1. **View Dashboard:** See API call volume, response times, and error rates at a glance
2. **Filter by Date:** Select hourly, daily, or weekly time ranges
3. **Response Time Charts:** View p50, p95, and p99 latency distributions
4. **Error Analysis:** See error rates broken down by endpoint and HTTP status code
5. **Endpoint Breakdown:** Table showing per-endpoint request count, avg latency, and error rate
6. **Top Consumers:** Identify which users or projects generate the most API traffic

### Data Masking (`/data-masking`)
1. **Create Rule:** Define a masking rule with a field name pattern (regex)
2. **Select Masking Type:** Choose Full Mask, Partial Mask, Hash, or Redact
3. **Set Value Pattern:** Optionally match specific value patterns (e.g., email, SSN, credit card)
4. **Preview Output:** See before/after comparison of masked data
5. **Apply to Test Data:** Enable the rule to automatically mask output from the Test Data Generator
6. **Manage Rules:** Edit, enable/disable, or delete masking rules per project

---

## Architecture

```
Frontend (React + Vite)  →  Firebase Hosting (CDN)
         ↓                         ↓
   Firebase Auth            Cloud Firestore (maghilqa)
   Firebase Storage         Firebase Cloud Functions
         ↓
   NestJS API  →  Google Cloud Run (auto-scales)
         ↓
   External APIs: Jira, Confluence, MS Teams, Claude AI, OpenAI
   Test Engines: Playwright (Chromium), Appium/WebDriverIO
```

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** NestJS + TypeScript on Cloud Run
- **Database:** Cloud Firestore
- **Auth:** Firebase Authentication
- **AI:** Claude API + OpenAI API (configurable)
- **Testing:** Playwright (real browser), Appium/WebDriverIO (real mobile)
- **CI/CD:** GitHub Actions, Jenkins, GitLab CI webhooks

## URLs
- **App:** https://maghil-qa.web.app
- **API:** https://jira-automation-api-144310927565.us-central1.run.app
- **Health:** https://jira-automation-api-144310927565.us-central1.run.app/api/v1/health
- **Swagger:** https://jira-automation-api-144310927565.us-central1.run.app/api/docs
