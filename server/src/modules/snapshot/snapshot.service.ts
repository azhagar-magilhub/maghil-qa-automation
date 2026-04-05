import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseAdminService } from '../../config/firebase-admin.config';
import axios from 'axios';

interface Snapshot {
  id: string;
  userId: string;
  name: string;
  type: 'api_response' | 'json_data';
  url?: string;
  baseline: unknown;
  current?: unknown;
  status: 'ACTIVE' | 'OUTDATED' | 'ACCEPTED';
  createdAt: Date;
  updatedAt: Date;
}

interface DiffResult {
  changed: Array<{ path: string; oldValue: unknown; newValue: unknown }>;
  added: Array<{ path: string; value: unknown }>;
  removed: Array<{ path: string; value: unknown }>;
}

@Injectable()
export class SnapshotService {
  private readonly logger = new Logger(SnapshotService.name);

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  private get db() {
    return this.firebaseAdmin.firestore();
  }

  async capture(
    userId: string,
    config: { name: string; type: 'api_response' | 'json_data'; url?: string; data?: unknown },
  ): Promise<{ snapshotId: string; snapshot: unknown }> {
    let capturedData: unknown;

    if (config.type === 'api_response' && config.url) {
      try {
        const response = await axios.get(config.url, {
          timeout: 10000,
          validateStatus: () => true,
        });
        capturedData = {
          status: response.status,
          headers: response.headers,
          body: response.data,
        };
      } catch (err) {
        throw new Error(`Failed to capture snapshot from ${config.url}: ${err.message}`);
      }
    } else {
      capturedData = config.data;
    }

    const snapshotRef = this.db
      .collection(`users/${userId}/snapshots`)
      .doc();

    const snapshot: Omit<Snapshot, 'id'> = {
      userId,
      name: config.name,
      type: config.type,
      url: config.url,
      baseline: capturedData,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await snapshotRef.set(snapshot);

    this.logger.log(`Captured snapshot ${snapshotRef.id}: ${config.name}`);

    return { snapshotId: snapshotRef.id, snapshot: capturedData };
  }

  async compare(
    userId: string,
    snapshotId: string,
  ): Promise<DiffResult & { hasChanges: boolean }> {
    const doc = await this.db
      .doc(`users/${userId}/snapshots/${snapshotId}`)
      .get();

    if (!doc.exists) {
      throw new NotFoundException(`Snapshot ${snapshotId} not found`);
    }

    const snapshot = doc.data() as Omit<Snapshot, 'id'>;
    let currentData: unknown;

    if (snapshot.type === 'api_response' && snapshot.url) {
      try {
        const response = await axios.get(snapshot.url, {
          timeout: 10000,
          validateStatus: () => true,
        });
        currentData = {
          status: response.status,
          headers: response.headers,
          body: response.data,
        };
      } catch (err) {
        throw new Error(
          `Failed to fetch current data from ${snapshot.url}: ${err.message}`,
        );
      }
    } else {
      currentData = snapshot.current || snapshot.baseline;
    }

    const diff = this.deepDiff(snapshot.baseline, currentData);

    // Update snapshot with current data
    await this.db
      .doc(`users/${userId}/snapshots/${snapshotId}`)
      .update({
        current: currentData,
        status: diff.changed.length > 0 || diff.added.length > 0 || diff.removed.length > 0
          ? 'OUTDATED'
          : 'ACTIVE',
        updatedAt: new Date(),
      });

    const hasChanges =
      diff.changed.length > 0 ||
      diff.added.length > 0 ||
      diff.removed.length > 0;

    return { ...diff, hasChanges };
  }

  async acceptBaseline(
    userId: string,
    snapshotId: string,
  ): Promise<{ status: string }> {
    const doc = await this.db
      .doc(`users/${userId}/snapshots/${snapshotId}`)
      .get();

    if (!doc.exists) {
      throw new NotFoundException(`Snapshot ${snapshotId} not found`);
    }

    const snapshot = doc.data() as Omit<Snapshot, 'id'>;

    await this.db
      .doc(`users/${userId}/snapshots/${snapshotId}`)
      .update({
        baseline: snapshot.current || snapshot.baseline,
        current: null,
        status: 'ACCEPTED',
        updatedAt: new Date(),
      });

    this.logger.log(`Accepted new baseline for snapshot ${snapshotId}`);

    return { status: 'ACCEPTED' };
  }

  private deepDiff(
    baseline: unknown,
    current: unknown,
    path = '',
  ): DiffResult {
    const result: DiffResult = { changed: [], added: [], removed: [] };

    if (baseline === current) return result;

    if (
      typeof baseline !== 'object' ||
      typeof current !== 'object' ||
      baseline === null ||
      current === null
    ) {
      if (baseline !== current) {
        result.changed.push({ path: path || '$', oldValue: baseline, newValue: current });
      }
      return result;
    }

    const baseObj = baseline as Record<string, unknown>;
    const currObj = current as Record<string, unknown>;
    const allKeys = new Set([
      ...Object.keys(baseObj),
      ...Object.keys(currObj),
    ]);

    for (const key of allKeys) {
      const fullPath = path ? `${path}.${key}` : key;

      if (!(key in baseObj)) {
        result.added.push({ path: fullPath, value: currObj[key] });
      } else if (!(key in currObj)) {
        result.removed.push({ path: fullPath, value: baseObj[key] });
      } else if (
        typeof baseObj[key] === 'object' &&
        typeof currObj[key] === 'object' &&
        baseObj[key] !== null &&
        currObj[key] !== null
      ) {
        const nested = this.deepDiff(baseObj[key], currObj[key], fullPath);
        result.changed.push(...nested.changed);
        result.added.push(...nested.added);
        result.removed.push(...nested.removed);
      } else if (baseObj[key] !== currObj[key]) {
        result.changed.push({
          path: fullPath,
          oldValue: baseObj[key],
          newValue: currObj[key],
        });
      }
    }

    return result;
  }
}
