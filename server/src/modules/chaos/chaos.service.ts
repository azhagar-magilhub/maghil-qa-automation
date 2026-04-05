import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseAdminService } from '../../config/firebase-admin.config';
import axios from 'axios';

type FaultType = 'LATENCY' | 'HTTP_ERROR' | 'DEPENDENCY_FAILURE';

interface ChaosExperiment {
  id: string;
  userId: string;
  targetUrl: string;
  faultType: FaultType;
  duration: number;
  intensity: number;
  blastRadius: number;
  status: 'CREATED' | 'RUNNING' | 'COMPLETED' | 'ABORTED' | 'FAILED';
  results?: ChaosResult;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

interface ChaosResult {
  totalRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  maxResponseTime: number;
  recoveryTime?: number;
  healthChecks: Array<{ timestamp: Date; healthy: boolean; responseTime: number }>;
}

@Injectable()
export class ChaosService {
  private readonly logger = new Logger(ChaosService.name);
  private readonly runningExperiments = new Map<string, boolean>();

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  private get db() {
    return this.firebaseAdmin.firestore();
  }

  async createExperiment(
    userId: string,
    config: {
      targetUrl: string;
      faultType: FaultType;
      duration: number;
      intensity: number;
      blastRadius: number;
    },
  ): Promise<{ experimentId: string }> {
    const expRef = this.db
      .collection(`users/${userId}/chaosExperiments`)
      .doc();

    const experiment: Omit<ChaosExperiment, 'id'> = {
      userId,
      targetUrl: config.targetUrl,
      faultType: config.faultType,
      duration: config.duration,
      intensity: config.intensity,
      blastRadius: config.blastRadius,
      status: 'CREATED',
      createdAt: new Date(),
    };

    await expRef.set(experiment);

    this.logger.log(
      `Created chaos experiment ${expRef.id}: ${config.faultType} on ${config.targetUrl}`,
    );

    return { experimentId: expRef.id };
  }

  async runExperiment(
    userId: string,
    expId: string,
  ): Promise<{ status: string; message: string }> {
    const expRef = this.db.doc(
      `users/${userId}/chaosExperiments/${expId}`,
    );
    const doc = await expRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Experiment ${expId} not found`);
    }

    const experiment = { id: doc.id, ...doc.data() } as ChaosExperiment;

    if (experiment.status === 'RUNNING') {
      return { status: 'ALREADY_RUNNING', message: 'Experiment is already running' };
    }

    await expRef.update({ status: 'RUNNING', startedAt: new Date() });
    this.runningExperiments.set(expId, true);

    // Execute chaos asynchronously
    this.executeChaos(userId, expId, experiment).catch((err) => {
      this.logger.error(`Chaos experiment ${expId} failed: ${err.message}`);
    });

    return { status: 'STARTED', message: `Experiment ${expId} started` };
  }

  private async executeChaos(
    userId: string,
    expId: string,
    experiment: ChaosExperiment,
  ): Promise<void> {
    const expRef = this.db.doc(
      `users/${userId}/chaosExperiments/${expId}`,
    );

    const healthChecks: ChaosResult['healthChecks'] = [];
    let totalRequests = 0;
    let failedRequests = 0;
    let totalResponseTime = 0;
    let maxResponseTime = 0;

    const durationMs = experiment.duration * 1000;
    const startTime = Date.now();
    const intervalMs = 1000;

    try {
      while (
        Date.now() - startTime < durationMs &&
        this.runningExperiments.get(expId)
      ) {
        totalRequests++;
        const reqStart = Date.now();

        try {
          if (experiment.faultType === 'LATENCY') {
            // Simulate latency injection by adding artificial delay
            const delay = Math.random() * experiment.intensity * 1000;
            await new Promise((resolve) => setTimeout(resolve, delay));
          }

          if (
            experiment.faultType === 'HTTP_ERROR' &&
            Math.random() * 100 < experiment.blastRadius
          ) {
            // Simulate HTTP error injection
            failedRequests++;
            const responseTime = Date.now() - reqStart;
            totalResponseTime += responseTime;
            maxResponseTime = Math.max(maxResponseTime, responseTime);
            healthChecks.push({
              timestamp: new Date(),
              healthy: false,
              responseTime,
            });
            await new Promise((resolve) => setTimeout(resolve, intervalMs));
            continue;
          }

          if (experiment.faultType === 'DEPENDENCY_FAILURE') {
            // Simulate dependency failure by checking if target is reachable
            if (Math.random() * 100 < experiment.blastRadius) {
              failedRequests++;
              const responseTime = Date.now() - reqStart;
              totalResponseTime += responseTime;
              maxResponseTime = Math.max(maxResponseTime, responseTime);
              healthChecks.push({
                timestamp: new Date(),
                healthy: false,
                responseTime,
              });
              await new Promise((resolve) => setTimeout(resolve, intervalMs));
              continue;
            }
          }

          // Health check request to target
          const response = await axios.get(experiment.targetUrl, {
            timeout: 5000,
            validateStatus: () => true,
          });

          const responseTime = Date.now() - reqStart;
          totalResponseTime += responseTime;
          maxResponseTime = Math.max(maxResponseTime, responseTime);

          const healthy = response.status >= 200 && response.status < 500;
          if (!healthy) failedRequests++;

          healthChecks.push({
            timestamp: new Date(),
            healthy,
            responseTime,
          });
        } catch {
          failedRequests++;
          const responseTime = Date.now() - reqStart;
          totalResponseTime += responseTime;
          maxResponseTime = Math.max(maxResponseTime, responseTime);

          healthChecks.push({
            timestamp: new Date(),
            healthy: false,
            responseTime,
          });
        }

        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }

      // Calculate recovery time from last failure to first success
      let recoveryTime: number | undefined;
      const lastFailIndex = healthChecks
        .map((h, i) => (!h.healthy ? i : -1))
        .filter((i) => i >= 0)
        .pop();
      if (lastFailIndex !== undefined && lastFailIndex >= 0) {
        const firstSuccessAfter = healthChecks.findIndex(
          (h, i) => i > lastFailIndex && h.healthy,
        );
        if (firstSuccessAfter >= 0) {
          recoveryTime =
            new Date(healthChecks[firstSuccessAfter].timestamp).getTime() -
            new Date(healthChecks[lastFailIndex].timestamp).getTime();
        }
      }

      const results: ChaosResult = {
        totalRequests,
        failedRequests,
        avgResponseTime:
          totalRequests > 0 ? totalResponseTime / totalRequests : 0,
        maxResponseTime,
        recoveryTime,
        healthChecks: healthChecks.slice(-100), // Keep last 100 checks
      };

      const status = this.runningExperiments.get(expId)
        ? 'COMPLETED'
        : 'ABORTED';

      await expRef.update({
        status,
        results,
        completedAt: new Date(),
      });
    } catch (err) {
      await expRef.update({
        status: 'FAILED',
        completedAt: new Date(),
      });
      throw err;
    } finally {
      this.runningExperiments.delete(expId);
    }
  }

  async abortExperiment(
    userId: string,
    expId: string,
  ): Promise<{ status: string }> {
    const doc = await this.db
      .doc(`users/${userId}/chaosExperiments/${expId}`)
      .get();

    if (!doc.exists) {
      throw new NotFoundException(`Experiment ${expId} not found`);
    }

    this.runningExperiments.set(expId, false);

    this.logger.log(`Aborting chaos experiment ${expId}`);
    return { status: 'ABORTING' };
  }

  async getResults(
    userId: string,
    expId: string,
  ): Promise<ChaosExperiment> {
    const doc = await this.db
      .doc(`users/${userId}/chaosExperiments/${expId}`)
      .get();

    if (!doc.exists) {
      throw new NotFoundException(`Experiment ${expId} not found`);
    }

    return { id: doc.id, ...doc.data() } as ChaosExperiment;
  }
}
