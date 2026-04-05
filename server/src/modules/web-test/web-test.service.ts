import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

// NOTE: For Cloud Run / Docker deployment, the Dockerfile must install browser
// dependencies. Example Dockerfile additions:
//   RUN npx playwright install --with-deps chromium
//   (or install all browsers: npx playwright install --with-deps)
// For local development, run: npx playwright install chromium

interface WebTestConfig {
  script: string;
  targetUrl: string;
  browser: 'chromium' | 'firefox' | 'webkit';
  viewport: { width: number; height: number };
}

interface TestExecution {
  id: string;
  userId: string;
  status: 'RUNNING' | 'PASSED' | 'FAILED' | 'ERROR';
  config: WebTestConfig;
  results?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class WebTestService {
  private readonly logger = new Logger(WebTestService.name);

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  private get db() {
    return this.firebaseAdmin.firestore();
  }

  async runTest(
    userId: string,
    config: WebTestConfig,
  ): Promise<{ executionId: string; status: string }> {
    const executionRef = this.db
      .collection(`users/${userId}/webTestExecutions`)
      .doc();

    const execution: Omit<TestExecution, 'id'> = {
      userId,
      status: 'RUNNING',
      config,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await executionRef.set(execution);

    this.logger.log(
      `Created web test execution ${executionRef.id} for user ${userId}`,
    );

    // Execute the Playwright test asynchronously
    this.executePlaywrightTest(userId, executionRef.id, config).catch(
      (err) => {
        this.logger.error(
          `Web test ${executionRef.id} failed unexpectedly: ${err.message}`,
        );
      },
    );

    return { executionId: executionRef.id, status: 'RUNNING' };
  }

  private async executePlaywrightTest(
    userId: string,
    executionId: string,
    config: WebTestConfig,
  ): Promise<void> {
    const executionRef = this.db.doc(
      `users/${userId}/webTestExecutions/${executionId}`,
    );

    // Lazy-import playwright-core to avoid hard failure if not installed
    let pw: typeof import('playwright-core');
    try {
      pw = await import('playwright-core');
    } catch {
      await executionRef.update({
        status: 'ERROR',
        updatedAt: new Date(),
        results: {
          error:
            'playwright-core is not installed. Run: npm install playwright-core && npx playwright install chromium',
        },
      });
      return;
    }

    let browser: import('playwright-core').Browser | null = null;
    const startTime = Date.now();
    const steps: Array<{
      name: string;
      status: string;
      duration: number;
      error?: string;
    }> = [];
    const consoleErrors: string[] = [];
    let screenshotBase64: string | null = null;

    try {
      // Step 1: Launch browser
      const launchStart = Date.now();
      const browserType = pw[config.browser] || pw.chromium;
      browser = await browserType.launch({ headless: true });
      steps.push({
        name: `Launch ${config.browser} browser`,
        status: 'passed',
        duration: Date.now() - launchStart,
      });

      // Step 2: Create page with viewport
      const context = await browser.newContext({
        viewport: config.viewport || { width: 1280, height: 720 },
      });
      const page = await context.newPage();

      // Capture console errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      page.on('pageerror', (err) => {
        consoleErrors.push(err.message);
      });

      // Step 3: Navigate to target URL
      const navStart = Date.now();
      await page.goto(config.targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      steps.push({
        name: 'Navigate to target URL',
        status: 'passed',
        duration: Date.now() - navStart,
      });

      // Step 4: Execute user script if provided
      if (config.script && config.script.trim().length > 0) {
        const scriptStart = Date.now();
        try {
          await page.evaluate(config.script);
          steps.push({
            name: 'Execute test script',
            status: 'passed',
            duration: Date.now() - scriptStart,
          });
        } catch (scriptErr) {
          steps.push({
            name: 'Execute test script',
            status: 'failed',
            duration: Date.now() - scriptStart,
            error: scriptErr.message,
          });
        }
      }

      // Step 5: Take screenshot
      const ssStart = Date.now();
      const screenshotBuffer = await page.screenshot({ fullPage: false });
      screenshotBase64 = screenshotBuffer.toString('base64');
      steps.push({
        name: 'Capture screenshot',
        status: 'passed',
        duration: Date.now() - ssStart,
      });

      // Close context
      await context.close();

      // Determine overall status
      const hasFailedStep = steps.some((s) => s.status === 'failed');
      const totalDuration = Date.now() - startTime;

      await executionRef.update({
        status: hasFailedStep ? 'FAILED' : 'PASSED',
        updatedAt: new Date(),
        results: {
          steps,
          totalDuration,
          browser: config.browser,
          viewport: config.viewport,
          consoleErrors: consoleErrors.slice(0, 50), // cap stored errors
          screenshotBase64: screenshotBase64
            ? screenshotBase64.substring(0, 500000)
            : null, // cap at ~375KB to stay within Firestore doc limits
          screenshotNote:
            'Base64 PNG screenshot. For production, upload to Cloud Storage and store URL instead.',
        },
      });
    } catch (err) {
      const totalDuration = Date.now() - startTime;
      this.logger.error(
        `Playwright execution failed for ${executionId}: ${err.message}`,
      );
      await executionRef.update({
        status: 'ERROR',
        updatedAt: new Date(),
        results: {
          steps,
          totalDuration,
          error: err.message,
          consoleErrors: consoleErrors.slice(0, 50),
          browser: config.browser,
          viewport: config.viewport,
        },
      });
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeErr) {
          this.logger.warn(`Failed to close browser: ${closeErr.message}`);
        }
      }
    }
  }

  async getExecution(
    userId: string,
    executionId: string,
  ): Promise<TestExecution> {
    const doc = await this.db
      .doc(`users/${userId}/webTestExecutions/${executionId}`)
      .get();

    if (!doc.exists) {
      throw new NotFoundException(
        `Test execution ${executionId} not found`,
      );
    }

    return { id: doc.id, ...doc.data() } as TestExecution;
  }

  async compareVisual(
    userId: string,
    baselineId: string,
    currentId: string,
  ): Promise<{
    match: boolean;
    diffPercentage: number;
    diffImageUrl: string | null;
  }> {
    // Stub: visual regression comparison would use pixelmatch or similar
    // In production, this fetches screenshots from two executions and compares
    this.logger.log(
      `Visual diff requested: baseline=${baselineId}, current=${currentId}`,
    );

    return {
      match: true,
      diffPercentage: 0.0,
      diffImageUrl: null,
    };
  }

  async listExecutions(
    userId: string,
  ): Promise<TestExecution[]> {
    const snapshot = await this.db
      .collection(`users/${userId}/webTestExecutions`)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TestExecution[];
  }
}
