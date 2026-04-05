import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

interface FlakeRecord {
  id: string;
  userId: string;
  testId: string;
  testName: string;
  flakeScore: number;
  totalRuns: number;
  passCount: number;
  failCount: number;
  isQuarantined: boolean;
  history: Array<{ status: 'pass' | 'fail'; timestamp: Date }>;
  lastRunAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class FlakeAnalyzerService {
  private readonly logger = new Logger(FlakeAnalyzerService.name);

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  private get db() {
    return this.firebaseAdmin.firestore();
  }

  async getFlakes(
    userId: string,
  ): Promise<FlakeRecord[]> {
    const snapshot = await this.db
      .collection(`users/${userId}/flakeRecords`)
      .where('flakeScore', '>', 0)
      .orderBy('flakeScore', 'desc')
      .limit(100)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as FlakeRecord[];
  }

  async quarantine(
    userId: string,
    testId: string,
  ): Promise<{ status: string }> {
    const snapshot = await this.db
      .collection(`users/${userId}/flakeRecords`)
      .where('testId', '==', testId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new NotFoundException(`Flake record for test ${testId} not found`);
    }

    const docRef = snapshot.docs[0].ref;
    await docRef.update({
      isQuarantined: true,
      updatedAt: new Date(),
    });

    this.logger.log(`Quarantined test ${testId}`);

    return { status: 'QUARANTINED' };
  }

  async unquarantine(
    userId: string,
    testId: string,
  ): Promise<{ status: string }> {
    const snapshot = await this.db
      .collection(`users/${userId}/flakeRecords`)
      .where('testId', '==', testId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new NotFoundException(`Flake record for test ${testId} not found`);
    }

    const docRef = snapshot.docs[0].ref;
    await docRef.update({
      isQuarantined: false,
      updatedAt: new Date(),
    });

    this.logger.log(`Unquarantined test ${testId}`);

    return { status: 'ACTIVE' };
  }

  async recordResult(
    userId: string,
    testId: string,
    status: 'pass' | 'fail',
    testName?: string,
  ): Promise<{ flakeScore: number }> {
    const snapshot = await this.db
      .collection(`users/${userId}/flakeRecords`)
      .where('testId', '==', testId)
      .limit(1)
      .get();

    let docRef: FirebaseFirestore.DocumentReference;
    let record: Partial<FlakeRecord>;

    if (snapshot.empty) {
      // Create new flake record
      docRef = this.db.collection(`users/${userId}/flakeRecords`).doc();
      record = {
        userId,
        testId,
        testName: testName || testId,
        flakeScore: 0,
        totalRuns: 0,
        passCount: 0,
        failCount: 0,
        isQuarantined: false,
        history: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } else {
      docRef = snapshot.docs[0].ref;
      record = snapshot.docs[0].data() as FlakeRecord;
    }

    // Update counts
    const totalRuns = (record.totalRuns || 0) + 1;
    const passCount =
      (record.passCount || 0) + (status === 'pass' ? 1 : 0);
    const failCount =
      (record.failCount || 0) + (status === 'fail' ? 1 : 0);

    // Maintain rolling history (last 50 runs)
    const history = [
      ...(record.history || []).slice(-49),
      { status, timestamp: new Date() },
    ];

    // Calculate flake score based on recent transitions
    const flakeScore = this.calculateFlakeScore(history);

    await docRef.set(
      {
        userId,
        testId,
        testName: testName || record.testName || testId,
        flakeScore,
        totalRuns,
        passCount,
        failCount,
        isQuarantined: record.isQuarantined || false,
        history,
        lastRunAt: new Date(),
        createdAt: record.createdAt || new Date(),
        updatedAt: new Date(),
      },
      { merge: true },
    );

    return { flakeScore };
  }

  private calculateFlakeScore(
    history: Array<{ status: 'pass' | 'fail'; timestamp: Date }>,
  ): number {
    if (history.length < 2) return 0;

    // Count status transitions (pass->fail or fail->pass)
    let transitions = 0;
    for (let i = 1; i < history.length; i++) {
      if (history[i].status !== history[i - 1].status) {
        transitions++;
      }
    }

    // Flake score: ratio of transitions to total runs, scaled 0-100
    const score = Math.round((transitions / (history.length - 1)) * 100);

    return Math.min(100, score);
  }
}
