import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

interface ScheduleConfig {
  name: string;
  testType: 'api' | 'web' | 'security' | 'accessibility';
  testId: string;
  cronExpression: string;
  frequency: string;
  environment: string;
  enabled: boolean;
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  private get db() {
    return this.firebaseAdmin.firestore();
  }

  async createSchedule(
    userId: string,
    config: ScheduleConfig,
  ): Promise<{ id: string }> {
    const ref = this.db.collection('schedules').doc();

    await ref.set({
      userId,
      name: config.name,
      testType: config.testType,
      testId: config.testId || '',
      cronExpression: config.cronExpression,
      frequency: config.frequency,
      environment: config.environment || 'production',
      enabled: config.enabled ?? true,
      lastRun: null,
      lastRunStatus: null,
      nextRun: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.logger.log(`Created schedule ${ref.id} for user ${userId}`);
    return { id: ref.id };
  }

  async listSchedules(userId: string): Promise<Array<Record<string, unknown>>> {
    const snap = await this.db
      .collection('schedules')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  async triggerNow(
    userId: string,
    scheduleId: string,
  ): Promise<{ triggered: boolean; runId: string }> {
    const doc = await this.db.doc(`schedules/${scheduleId}`).get();

    if (!doc.exists) {
      throw new NotFoundException(`Schedule ${scheduleId} not found`);
    }

    const data = doc.data();
    if (data?.userId !== userId) {
      throw new NotFoundException(`Schedule ${scheduleId} not found`);
    }

    // Create a run record
    const runRef = this.db.collection('scheduleRuns').doc();
    await runRef.set({
      scheduleId,
      userId,
      status: 'RUNNING',
      triggeredManually: true,
      startedAt: new Date(),
      duration: 0,
      createdAt: new Date(),
    });

    // Update the schedule's last run info
    await this.db.doc(`schedules/${scheduleId}`).update({
      lastRun: new Date(),
      lastRunStatus: 'RUNNING',
      updatedAt: new Date(),
    });

    this.logger.log(`Manually triggered schedule ${scheduleId}`);
    return { triggered: true, runId: runRef.id };
  }

  async updateSchedule(
    userId: string,
    scheduleId: string,
    updates: Partial<ScheduleConfig>,
  ): Promise<{ updated: boolean }> {
    const doc = await this.db.doc(`schedules/${scheduleId}`).get();

    if (!doc.exists) {
      throw new NotFoundException(`Schedule ${scheduleId} not found`);
    }

    const data = doc.data();
    if (data?.userId !== userId) {
      throw new NotFoundException(`Schedule ${scheduleId} not found`);
    }

    const allowedFields: Record<string, unknown> = {};
    if (updates.name !== undefined) allowedFields.name = updates.name;
    if (updates.testType !== undefined) allowedFields.testType = updates.testType;
    if (updates.testId !== undefined) allowedFields.testId = updates.testId;
    if (updates.cronExpression !== undefined)
      allowedFields.cronExpression = updates.cronExpression;
    if (updates.frequency !== undefined) allowedFields.frequency = updates.frequency;
    if (updates.environment !== undefined)
      allowedFields.environment = updates.environment;
    if (updates.enabled !== undefined) allowedFields.enabled = updates.enabled;

    allowedFields.updatedAt = new Date();

    await this.db.doc(`schedules/${scheduleId}`).update(allowedFields);

    this.logger.log(`Updated schedule ${scheduleId}`);
    return { updated: true };
  }

  async deleteSchedule(
    userId: string,
    scheduleId: string,
  ): Promise<{ deleted: boolean }> {
    const doc = await this.db.doc(`schedules/${scheduleId}`).get();

    if (!doc.exists) {
      throw new NotFoundException(`Schedule ${scheduleId} not found`);
    }

    const data = doc.data();
    if (data?.userId !== userId) {
      throw new NotFoundException(`Schedule ${scheduleId} not found`);
    }

    await this.db.doc(`schedules/${scheduleId}`).delete();

    this.logger.log(`Deleted schedule ${scheduleId}`);
    return { deleted: true };
  }
}
