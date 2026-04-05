import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseAdminService } from '../../config/firebase-admin.config';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

interface LoadTestConfig {
  targetUrl: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  vus: number; // virtual users
  duration: number; // seconds
  rampUp: number; // seconds
  thresholds?: {
    maxResponseTime?: number; // ms
    maxErrorRate?: number; // percentage
    p95ResponseTime?: number; // ms
  };
}

interface PerformanceRun {
  id: string;
  userId: string;
  type: 'load' | 'lighthouse';
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  config?: LoadTestConfig;
  targetUrl: string;
  results?: Record<string, unknown>;
  createdAt: Date;
  completedAt?: Date;
}

@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  private get db() {
    return this.firebaseAdmin.firestore();
  }

  async runLoadTest(
    userId: string,
    config: LoadTestConfig,
  ): Promise<{ runId: string; status: string }> {
    const runRef = this.db
      .collection(`users/${userId}/performanceRuns`)
      .doc();

    const run: Omit<PerformanceRun, 'id'> = {
      userId,
      type: 'load',
      status: 'RUNNING',
      config,
      targetUrl: config.targetUrl,
      createdAt: new Date(),
    };

    await runRef.set(run);

    this.logger.log(
      `Created load test run ${runRef.id} for ${config.targetUrl} (${config.vus} VUs, ${config.duration}s)`,
    );

    // Execute load test asynchronously
    this.executeLoadTest(userId, runRef.id, config).catch((err) => {
      this.logger.error(
        `Load test ${runRef.id} failed: ${err.message}`,
      );
    });

    return { runId: runRef.id, status: 'RUNNING' };
  }

  private async executeLoadTest(
    userId: string,
    runId: string,
    config: LoadTestConfig,
  ): Promise<void> {
    const runRef = this.db.doc(
      `users/${userId}/performanceRuns/${runId}`,
    );

    try {
      const responseTimes: number[] = [];
      let errorCount = 0;
      let successCount = 0;

      // Cap concurrent requests and duration for safety
      const maxVUs = Math.min(config.vus, 50);
      const maxDuration = Math.min(config.duration, 30); // cap at 30s for safety
      const startTime = Date.now();
      const endTime = startTime + maxDuration * 1000;

      // Run concurrent requests in waves
      while (Date.now() < endTime) {
        const wavePromises: Promise<number>[] = [];

        for (let i = 0; i < maxVUs; i++) {
          wavePromises.push(this.makeTimedRequest(config));
        }

        const waveResults = await Promise.allSettled(wavePromises);

        for (const result of waveResults) {
          if (result.status === 'fulfilled') {
            responseTimes.push(result.value);
            successCount++;
          } else {
            errorCount++;
          }
        }

        // Brief pause between waves to avoid overwhelming
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const totalRequests = successCount + errorCount;
      const sortedTimes = [...responseTimes].sort((a, b) => a - b);

      const results = {
        totalRequests,
        successCount,
        errorCount,
        errorRate:
          totalRequests > 0
            ? Math.round((errorCount / totalRequests) * 100 * 100) / 100
            : 0,
        avgResponseTime:
          responseTimes.length > 0
            ? Math.round(
                responseTimes.reduce((a, b) => a + b, 0) /
                  responseTimes.length,
              )
            : 0,
        minResponseTime:
          sortedTimes.length > 0 ? sortedTimes[0] : 0,
        maxResponseTime:
          sortedTimes.length > 0
            ? sortedTimes[sortedTimes.length - 1]
            : 0,
        p50ResponseTime: this.percentile(sortedTimes, 50),
        p90ResponseTime: this.percentile(sortedTimes, 90),
        p95ResponseTime: this.percentile(sortedTimes, 95),
        p99ResponseTime: this.percentile(sortedTimes, 99),
        requestsPerSecond:
          totalRequests > 0
            ? Math.round(
                (totalRequests / ((Date.now() - startTime) / 1000)) * 100,
              ) / 100
            : 0,
        duration: Math.round((Date.now() - startTime) / 1000),
        vus: maxVUs,
        thresholdsPassed: this.evaluateThresholds(
          config.thresholds,
          sortedTimes,
          errorCount,
          totalRequests,
        ),
      };

      await runRef.update({
        status: 'COMPLETED',
        results,
        completedAt: new Date(),
      });
    } catch (err) {
      await runRef.update({
        status: 'FAILED',
        results: { error: err.message },
        completedAt: new Date(),
      });
    }
  }

  private makeTimedRequest(config: LoadTestConfig): Promise<number> {
    return new Promise((resolve, reject) => {
      const url = new URL(config.targetUrl);
      const client = url.protocol === 'https:' ? https : http;
      const startTime = Date.now();

      const options: http.RequestOptions = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: config.method,
        headers: config.headers || {},
        timeout: 30000,
      };

      const req = client.request(options, (res) => {
        // Consume response body
        res.resume();
        res.on('end', () => {
          const elapsed = Date.now() - startTime;
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}`));
          } else {
            resolve(elapsed);
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });

      if (config.body && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
        req.write(
          typeof config.body === 'string'
            ? config.body
            : JSON.stringify(config.body),
        );
      }

      req.end();
    });
  }

  private percentile(sortedArr: number[], p: number): number {
    if (sortedArr.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedArr.length) - 1;
    return sortedArr[Math.max(0, index)];
  }

  private evaluateThresholds(
    thresholds: LoadTestConfig['thresholds'] | undefined,
    sortedTimes: number[],
    errorCount: number,
    totalRequests: number,
  ): Record<string, { passed: boolean; actual: number; threshold: number }> {
    if (!thresholds) return {};

    const results: Record<
      string,
      { passed: boolean; actual: number; threshold: number }
    > = {};

    if (thresholds.maxResponseTime !== undefined) {
      const maxTime =
        sortedTimes.length > 0
          ? sortedTimes[sortedTimes.length - 1]
          : 0;
      results.maxResponseTime = {
        passed: maxTime <= thresholds.maxResponseTime,
        actual: maxTime,
        threshold: thresholds.maxResponseTime,
      };
    }

    if (thresholds.maxErrorRate !== undefined) {
      const errorRate =
        totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;
      results.maxErrorRate = {
        passed: errorRate <= thresholds.maxErrorRate,
        actual: Math.round(errorRate * 100) / 100,
        threshold: thresholds.maxErrorRate,
      };
    }

    if (thresholds.p95ResponseTime !== undefined) {
      const p95 = this.percentile(sortedTimes, 95);
      results.p95ResponseTime = {
        passed: p95 <= thresholds.p95ResponseTime,
        actual: p95,
        threshold: thresholds.p95ResponseTime,
      };
    }

    return results;
  }

  async runLighthouse(
    userId: string,
    targetUrl: string,
  ): Promise<{ runId: string; status: string }> {
    const runRef = this.db
      .collection(`users/${userId}/performanceRuns`)
      .doc();

    const run: Omit<PerformanceRun, 'id'> = {
      userId,
      type: 'lighthouse',
      status: 'RUNNING',
      targetUrl,
      createdAt: new Date(),
    };

    await runRef.set(run);

    this.logger.log(
      `Created Lighthouse audit ${runRef.id} for ${targetUrl}`,
    );

    // Stub: simulate Lighthouse audit completion
    // In production, this would invoke Lighthouse CLI or API
    setTimeout(async () => {
      try {
        await runRef.update({
          status: 'COMPLETED',
          completedAt: new Date(),
          results: {
            scores: {
              performance: 85,
              accessibility: 92,
              bestPractices: 88,
              seo: 95,
              pwa: 60,
            },
            metrics: {
              firstContentfulPaint: 1.2,
              largestContentfulPaint: 2.5,
              totalBlockingTime: 150,
              cumulativeLayoutShift: 0.05,
              speedIndex: 3.1,
              timeToInteractive: 3.8,
            },
            audits: {
              passed: 45,
              failed: 8,
              informative: 12,
            },
          },
        });
      } catch (err) {
        this.logger.error(
          `Failed to update Lighthouse run ${runRef.id}: ${err.message}`,
        );
      }
    }, 5000);

    return { runId: runRef.id, status: 'RUNNING' };
  }

  async getRun(
    userId: string,
    runId: string,
  ): Promise<PerformanceRun> {
    const doc = await this.db
      .doc(`users/${userId}/performanceRuns/${runId}`)
      .get();

    if (!doc.exists) {
      throw new NotFoundException(
        `Performance run ${runId} not found`,
      );
    }

    return { id: doc.id, ...doc.data() } as PerformanceRun;
  }
}
