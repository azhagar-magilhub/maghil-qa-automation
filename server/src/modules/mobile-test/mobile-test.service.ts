import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

interface MobileTestConfig {
  script: string;
  appUrl: string;
  platform: 'android' | 'ios';
  deviceName: string;
  capabilities: Record<string, unknown>;
  appiumServerUrl?: string;
}

interface DeviceConfig {
  name: string;
  platform: 'android' | 'ios';
  osVersion: string;
  screenSize: string;
  available: boolean;
}

interface MobileTestExecution {
  id: string;
  userId: string;
  status: 'RUNNING' | 'PASSED' | 'FAILED' | 'ERROR';
  config: MobileTestConfig;
  results?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Default Appium server URL if not provided in config
const DEFAULT_APPIUM_URL = 'http://localhost:4723';

@Injectable()
export class MobileTestService {
  private readonly logger = new Logger(MobileTestService.name);

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  private get db() {
    return this.firebaseAdmin.firestore();
  }

  async getDevices(userId: string): Promise<DeviceConfig[]> {
    this.logger.log(`Fetching device list for user ${userId}`);

    // Try to get live sessions from Appium server
    const liveDevices = await this.fetchAppiumDevices();
    if (liveDevices.length > 0) {
      return liveDevices;
    }

    // Fall back to predefined device list when Appium is unreachable
    this.logger.warn(
      'Appium server not reachable, returning predefined device list',
    );
    return [
      {
        name: 'Pixel 7',
        platform: 'android',
        osVersion: '14',
        screenSize: '1080x2400',
        available: true,
      },
      {
        name: 'Pixel 5',
        platform: 'android',
        osVersion: '13',
        screenSize: '1080x2340',
        available: true,
      },
      {
        name: 'Samsung Galaxy S23',
        platform: 'android',
        osVersion: '14',
        screenSize: '1080x2340',
        available: true,
      },
      {
        name: 'iPhone 15 Pro',
        platform: 'ios',
        osVersion: '17.0',
        screenSize: '1179x2556',
        available: true,
      },
      {
        name: 'iPhone 14',
        platform: 'ios',
        osVersion: '16.0',
        screenSize: '1170x2532',
        available: true,
      },
      {
        name: 'iPad Air',
        platform: 'ios',
        osVersion: '17.0',
        screenSize: '1640x2360',
        available: true,
      },
    ];
  }

  private async fetchAppiumDevices(): Promise<DeviceConfig[]> {
    try {
      const http = await import('http');
      const url = new (await import('url')).URL(
        '/status',
        DEFAULT_APPIUM_URL,
      );

      const statusResponse = await new Promise<string>((resolve, reject) => {
        const req = http.request(
          {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'GET',
            timeout: 3000,
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => resolve(data));
          },
        );
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Appium status check timed out'));
        });
        req.end();
      });

      const status = JSON.parse(statusResponse);
      this.logger.log(`Appium server status: ${JSON.stringify(status)}`);

      // Fetch active sessions
      const sessionsUrl = new (await import('url')).URL(
        '/sessions',
        DEFAULT_APPIUM_URL,
      );

      const sessionsResponse = await new Promise<string>(
        (resolve, reject) => {
          const req = http.request(
            {
              hostname: sessionsUrl.hostname,
              port: sessionsUrl.port,
              path: sessionsUrl.pathname,
              method: 'GET',
              timeout: 3000,
            },
            (res) => {
              let data = '';
              res.on('data', (chunk) => (data += chunk));
              res.on('end', () => resolve(data));
            },
          );
          req.on('error', reject);
          req.on('timeout', () => {
            req.destroy();
            reject(new Error('Appium sessions check timed out'));
          });
          req.end();
        },
      );

      const sessions = JSON.parse(sessionsResponse);
      const devices: DeviceConfig[] = [];

      if (sessions.value && Array.isArray(sessions.value)) {
        for (const session of sessions.value) {
          const caps = session.capabilities || {};
          devices.push({
            name: caps.deviceName || 'Unknown Device',
            platform: (caps.platformName || '').toLowerCase() === 'ios'
              ? 'ios'
              : 'android',
            osVersion: caps.platformVersion || 'unknown',
            screenSize: 'unknown',
            available: true,
          });
        }
      }

      return devices;
    } catch {
      // Appium not reachable
      return [];
    }
  }

  async runTest(
    userId: string,
    config: MobileTestConfig,
  ): Promise<{ executionId: string; status: string }> {
    this.validateCapabilities(config.capabilities);

    const executionRef = this.db
      .collection(`users/${userId}/mobileTestExecutions`)
      .doc();

    const execution: Omit<MobileTestExecution, 'id'> = {
      userId,
      status: 'RUNNING',
      config,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await executionRef.set(execution);

    this.logger.log(
      `Created mobile test execution ${executionRef.id} for user ${userId} on ${config.deviceName}`,
    );

    // Execute the Appium test asynchronously via WebDriverIO
    this.executeAppiumTest(userId, executionRef.id, config).catch((err) => {
      this.logger.error(
        `Mobile test ${executionRef.id} failed unexpectedly: ${err.message}`,
      );
    });

    return { executionId: executionRef.id, status: 'RUNNING' };
  }

  private async executeAppiumTest(
    userId: string,
    executionId: string,
    config: MobileTestConfig,
  ): Promise<void> {
    const executionRef = this.db.doc(
      `users/${userId}/mobileTestExecutions/${executionId}`,
    );

    // Lazy-import webdriverio to avoid hard failure if not installed
    let wdio: typeof import('webdriverio');
    try {
      wdio = await import('webdriverio');
    } catch {
      await executionRef.update({
        status: 'ERROR',
        updatedAt: new Date(),
        results: {
          error:
            'webdriverio is not installed. Run: npm install webdriverio',
        },
      });
      return;
    }

    let driver: Awaited<ReturnType<typeof wdio.remote>> | null = null;
    const startTime = Date.now();
    const steps: Array<{
      name: string;
      status: string;
      duration: number;
      error?: string;
    }> = [];
    let screenshotBase64: string | null = null;
    let deviceLogs: string[] = [];

    try {
      // Step 1: Connect to Appium server and create session
      const connectStart = Date.now();
      const appiumUrl = config.appiumServerUrl || DEFAULT_APPIUM_URL;

      const capabilities: Record<string, unknown> = {
        platformName:
          config.platform === 'ios' ? 'iOS' : 'Android',
        'appium:deviceName': config.deviceName,
        'appium:automationName':
          config.platform === 'ios' ? 'XCUITest' : 'UiAutomator2',
        ...config.capabilities,
      };

      // Set app URL if provided
      if (config.appUrl) {
        capabilities['appium:app'] = config.appUrl;
      }

      driver = await wdio.remote({
        protocol: new URL(appiumUrl).protocol.replace(':', '') as
          | 'http'
          | 'https',
        hostname: new URL(appiumUrl).hostname,
        port: parseInt(new URL(appiumUrl).port || '4723', 10),
        path: '/',
        capabilities: capabilities as WebdriverIO.Capabilities,
        connectionRetryTimeout: 30000,
        connectionRetryCount: 1,
      });

      steps.push({
        name: 'Connect to Appium and create session',
        status: 'passed',
        duration: Date.now() - connectStart,
      });

      // Step 2: Execute user script if provided
      if (config.script && config.script.trim().length > 0) {
        const scriptStart = Date.now();
        try {
          await this.executeMobileScript(driver, config.script);
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

      // Step 3: Take screenshot
      const ssStart = Date.now();
      try {
        screenshotBase64 = await driver.takeScreenshot();
        steps.push({
          name: 'Capture screenshot',
          status: 'passed',
          duration: Date.now() - ssStart,
        });
      } catch (ssErr) {
        steps.push({
          name: 'Capture screenshot',
          status: 'failed',
          duration: Date.now() - ssStart,
          error: ssErr.message,
        });
      }

      // Step 4: Get device logs
      const logStart = Date.now();
      try {
        const logType =
          config.platform === 'ios' ? 'syslog' : 'logcat';
        const logs = await driver.getLogs(logType);
        deviceLogs = logs
          .slice(-100) // last 100 log entries
          .map(
            (entry: { message?: string; timestamp?: number }) =>
              entry.message || JSON.stringify(entry),
          );
        steps.push({
          name: 'Collect device logs',
          status: 'passed',
          duration: Date.now() - logStart,
        });
      } catch (logErr) {
        this.logger.warn(`Failed to get device logs: ${logErr.message}`);
        steps.push({
          name: 'Collect device logs',
          status: 'failed',
          duration: Date.now() - logStart,
          error: logErr.message,
        });
      }

      // Determine overall status
      const hasFailedStep = steps.some((s) => s.status === 'failed');
      const totalDuration = Date.now() - startTime;

      await executionRef.update({
        status: hasFailedStep ? 'FAILED' : 'PASSED',
        updatedAt: new Date(),
        results: {
          steps,
          totalDuration,
          device: config.deviceName,
          platform: config.platform,
          screenshotBase64: screenshotBase64
            ? screenshotBase64.substring(0, 500000)
            : null,
          logs: deviceLogs.slice(0, 200),
          screenshotNote:
            'Base64 PNG screenshot. For production, upload to Cloud Storage and store URL instead.',
        },
      });
    } catch (err) {
      const totalDuration = Date.now() - startTime;
      this.logger.error(
        `Appium execution failed for ${executionId}: ${err.message}`,
      );
      await executionRef.update({
        status: 'ERROR',
        updatedAt: new Date(),
        results: {
          steps,
          totalDuration,
          error: err.message,
          device: config.deviceName,
          platform: config.platform,
        },
      });
    } finally {
      if (driver) {
        try {
          await driver.deleteSession();
        } catch (closeErr) {
          this.logger.warn(
            `Failed to close Appium session: ${closeErr.message}`,
          );
        }
      }
    }
  }

  /**
   * Parse and execute a simple mobile test script.
   * Supports basic commands (one per line):
   *   findAndClick <selector>
   *   findAndType <selector> <text>
   *   pause <ms>
   *   back
   */
  private async executeMobileScript(
    driver: WebdriverIO.Browser,
    script: string,
  ): Promise<void> {
    const lines = script
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));

    for (const line of lines) {
      const parts = line.split(/\s+/);
      const command = parts[0]?.toLowerCase();

      switch (command) {
        case 'findandclick': {
          const selector = parts.slice(1).join(' ');
          const el = await driver.$(selector);
          await el.click();
          break;
        }
        case 'findandtype': {
          // findAndType <selector> ||| <text>
          const rest = parts.slice(1).join(' ');
          const [selector, text] = rest.split('|||').map((s) => s.trim());
          if (!selector || !text) {
            throw new Error(
              `Invalid findAndType syntax. Expected: findAndType <selector> ||| <text>`,
            );
          }
          const el = await driver.$(selector);
          await el.setValue(text);
          break;
        }
        case 'pause': {
          const ms = parseInt(parts[1] || '1000', 10);
          await driver.pause(Math.min(ms, 10000)); // cap at 10s
          break;
        }
        case 'back': {
          await driver.back();
          break;
        }
        default:
          this.logger.warn(`Unknown mobile script command: ${command}`);
      }
    }
  }

  async getExecution(
    userId: string,
    executionId: string,
  ): Promise<MobileTestExecution> {
    const doc = await this.db
      .doc(`users/${userId}/mobileTestExecutions/${executionId}`)
      .get();

    if (!doc.exists) {
      throw new NotFoundException(
        `Mobile test execution ${executionId} not found`,
      );
    }

    return { id: doc.id, ...doc.data() } as MobileTestExecution;
  }

  validateCapabilities(
    capabilities: Record<string, unknown>,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const requiredFields = ['platformName'];
    for (const field of requiredFields) {
      if (!capabilities[field]) {
        errors.push(`Missing required capability: ${field}`);
      }
    }

    const platformName = capabilities.platformName as string | undefined;
    if (
      platformName &&
      !['Android', 'iOS'].includes(platformName)
    ) {
      errors.push(
        `Invalid platformName: ${platformName}. Must be "Android" or "iOS"`,
      );
    }

    if (
      capabilities.automationName &&
      !['UiAutomator2', 'XCUITest', 'Espresso'].includes(
        capabilities.automationName as string,
      )
    ) {
      errors.push(
        `Invalid automationName: ${capabilities.automationName}. Must be "UiAutomator2", "XCUITest", or "Espresso"`,
      );
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        valid: false,
        errors,
      });
    }

    return { valid: true, errors: [] };
  }
}
