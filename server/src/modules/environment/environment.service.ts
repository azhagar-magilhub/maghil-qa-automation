import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseAdminService } from '../../config/firebase-admin.config';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

interface EnvironmentConfig {
  id?: string;
  name: string;
  baseUrl: string;
  type: 'DEV' | 'STAGING' | 'QA' | 'PRODUCTION' | 'CUSTOM';
  variables?: Record<string, string>;
  headers?: Record<string, string>;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface HealthCheckResult {
  envId: string;
  envName: string;
  baseUrl: string;
  status: 'UP' | 'DOWN' | 'DEGRADED';
  responseTimeMs: number;
  statusCode?: number;
  checkedAt: string;
  error?: string;
}

interface ConfigDiff {
  field: string;
  env1Value: unknown;
  env2Value: unknown;
  status: 'ADDED' | 'REMOVED' | 'CHANGED' | 'SAME';
}

@Injectable()
export class EnvironmentService {
  private readonly logger = new Logger(EnvironmentService.name);

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  private get db() {
    return this.firebaseAdmin.firestore();
  }

  async register(
    userId: string,
    env: Omit<EnvironmentConfig, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<EnvironmentConfig> {
    const docRef = this.db.collection(`users/${userId}/environments`).doc();

    const envDoc: Omit<EnvironmentConfig, 'id'> = {
      ...env,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await docRef.set(envDoc);
    this.logger.log(`Registered environment "${env.name}" for user ${userId}`);

    return { id: docRef.id, ...envDoc };
  }

  async checkHealth(userId: string, envId: string): Promise<HealthCheckResult> {
    const doc = await this.db
      .doc(`users/${userId}/environments/${envId}`)
      .get();

    if (!doc.exists) {
      throw new NotFoundException(`Environment ${envId} not found`);
    }

    const env = doc.data() as EnvironmentConfig;
    const startTime = Date.now();

    try {
      const result = await this.httpGet(env.baseUrl, 10000);
      const responseTimeMs = Date.now() - startTime;

      let status: 'UP' | 'DOWN' | 'DEGRADED';
      if (result.statusCode >= 200 && result.statusCode < 400) {
        status = responseTimeMs > 5000 ? 'DEGRADED' : 'UP';
      } else if (result.statusCode >= 500) {
        status = 'DOWN';
      } else {
        status = 'DEGRADED';
      }

      return {
        envId,
        envName: env.name,
        baseUrl: env.baseUrl,
        status,
        responseTimeMs,
        statusCode: result.statusCode,
        checkedAt: new Date().toISOString(),
      };
    } catch (err) {
      const responseTimeMs = Date.now() - startTime;
      return {
        envId,
        envName: env.name,
        baseUrl: env.baseUrl,
        status: 'DOWN',
        responseTimeMs,
        checkedAt: new Date().toISOString(),
        error: err.message,
      };
    }
  }

  async diffConfigs(
    userId: string,
    envId1: string,
    envId2: string,
  ): Promise<{ env1: string; env2: string; differences: ConfigDiff[] }> {
    const [doc1, doc2] = await Promise.all([
      this.db.doc(`users/${userId}/environments/${envId1}`).get(),
      this.db.doc(`users/${userId}/environments/${envId2}`).get(),
    ]);

    if (!doc1.exists) {
      throw new NotFoundException(`Environment ${envId1} not found`);
    }
    if (!doc2.exists) {
      throw new NotFoundException(`Environment ${envId2} not found`);
    }

    const env1 = doc1.data() as EnvironmentConfig;
    const env2 = doc2.data() as EnvironmentConfig;
    const differences: ConfigDiff[] = [];

    // Compare top-level fields
    const fieldsToCompare = ['name', 'baseUrl', 'type', 'description'] as const;
    for (const field of fieldsToCompare) {
      const v1 = env1[field];
      const v2 = env2[field];
      if (JSON.stringify(v1) !== JSON.stringify(v2)) {
        differences.push({ field, env1Value: v1, env2Value: v2, status: 'CHANGED' });
      } else {
        differences.push({ field, env1Value: v1, env2Value: v2, status: 'SAME' });
      }
    }

    // Compare variables
    const vars1 = env1.variables || {};
    const vars2 = env2.variables || {};
    const allVarKeys = new Set([...Object.keys(vars1), ...Object.keys(vars2)]);

    for (const key of allVarKeys) {
      const v1 = vars1[key];
      const v2 = vars2[key];
      if (v1 === undefined) {
        differences.push({ field: `variables.${key}`, env1Value: undefined, env2Value: v2, status: 'ADDED' });
      } else if (v2 === undefined) {
        differences.push({ field: `variables.${key}`, env1Value: v1, env2Value: undefined, status: 'REMOVED' });
      } else if (v1 !== v2) {
        differences.push({ field: `variables.${key}`, env1Value: v1, env2Value: v2, status: 'CHANGED' });
      }
    }

    // Compare headers
    const hdrs1 = env1.headers || {};
    const hdrs2 = env2.headers || {};
    const allHdrKeys = new Set([...Object.keys(hdrs1), ...Object.keys(hdrs2)]);

    for (const key of allHdrKeys) {
      const v1 = hdrs1[key];
      const v2 = hdrs2[key];
      if (v1 === undefined) {
        differences.push({ field: `headers.${key}`, env1Value: undefined, env2Value: v2, status: 'ADDED' });
      } else if (v2 === undefined) {
        differences.push({ field: `headers.${key}`, env1Value: v1, env2Value: undefined, status: 'REMOVED' });
      } else if (v1 !== v2) {
        differences.push({ field: `headers.${key}`, env1Value: v1, env2Value: v2, status: 'CHANGED' });
      }
    }

    return {
      env1: env1.name,
      env2: env2.name,
      differences,
    };
  }

  async listEnvironments(userId: string): Promise<EnvironmentConfig[]> {
    const snapshot = await this.db
      .collection(`users/${userId}/environments`)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as EnvironmentConfig[];
  }

  // ---------- HTTP helper ----------

  private httpGet(
    targetUrl: string,
    timeout: number,
  ): Promise<{ statusCode: number }> {
    return new Promise((resolve, reject) => {
      const url = new URL(targetUrl);
      const isHttps = url.protocol === 'https:';
      const transport = isHttps ? https : http;

      const req = transport.get(
        {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname + url.search,
          timeout,
        },
        (res) => {
          // Consume response to free socket
          res.on('data', () => {});
          res.on('end', () => {
            resolve({ statusCode: res.statusCode || 0 });
          });
        },
      );

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Health check timed out'));
      });
    });
  }
}
