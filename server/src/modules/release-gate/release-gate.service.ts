import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

interface ReleaseGateCriteria {
  minTestPass: number;
  minCoverage: number;
  maxCriticalVulns: number;
}

interface ReleaseGate {
  id: string;
  userId: string;
  criteria: ReleaseGateCriteria;
  verdict: 'PASS' | 'FAIL' | 'PENDING';
  scorecard: Scorecard;
  approvals: Array<{ userId: string; approvedAt: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

interface Scorecard {
  testPassRate: { value: number; threshold: number; passed: boolean };
  coverageRate: { value: number; threshold: number; passed: boolean };
  criticalVulns: { value: number; threshold: number; passed: boolean };
  overallScore: number;
  verdict: 'PASS' | 'FAIL';
}

@Injectable()
export class ReleaseGateService {
  private readonly logger = new Logger(ReleaseGateService.name);

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  private get db() {
    return this.firebaseAdmin.firestore();
  }

  async evaluate(
    userId: string,
    config: { criteria: ReleaseGateCriteria },
  ): Promise<{ gateId: string; verdict: string; scorecard: Scorecard }> {
    const { criteria } = config;

    // Aggregate test results from Firestore
    const testPassRate = await this.aggregateTestPassRate(userId);

    // Aggregate coverage from latest report
    const coverageRate = await this.aggregateLatestCoverage(userId);

    // Aggregate security vulnerabilities
    const criticalVulnCount = await this.aggregateCriticalVulns(userId);

    // Build scorecard
    const scorecard: Scorecard = {
      testPassRate: {
        value: testPassRate,
        threshold: criteria.minTestPass,
        passed: testPassRate >= criteria.minTestPass,
      },
      coverageRate: {
        value: coverageRate,
        threshold: criteria.minCoverage,
        passed: coverageRate >= criteria.minCoverage,
      },
      criticalVulns: {
        value: criticalVulnCount,
        threshold: criteria.maxCriticalVulns,
        passed: criticalVulnCount <= criteria.maxCriticalVulns,
      },
      overallScore: 0,
      verdict: 'FAIL',
    };

    // Calculate overall score (weighted average)
    const weights = { testPassRate: 0.4, coverageRate: 0.3, criticalVulns: 0.3 };
    const testScore = scorecard.testPassRate.passed ? 100 : (testPassRate / criteria.minTestPass) * 100;
    const covScore = scorecard.coverageRate.passed ? 100 : (coverageRate / criteria.minCoverage) * 100;
    const vulnScore = scorecard.criticalVulns.passed
      ? 100
      : Math.max(0, 100 - (criticalVulnCount - criteria.maxCriticalVulns) * 20);

    scorecard.overallScore = Math.round(
      testScore * weights.testPassRate +
        covScore * weights.coverageRate +
        vulnScore * weights.criticalVulns,
    );

    const allPassed =
      scorecard.testPassRate.passed &&
      scorecard.coverageRate.passed &&
      scorecard.criticalVulns.passed;

    scorecard.verdict = allPassed ? 'PASS' : 'FAIL';

    // Store release gate
    const gateRef = this.db
      .collection(`users/${userId}/releaseGates`)
      .doc();

    const gate: Omit<ReleaseGate, 'id'> = {
      userId,
      criteria,
      verdict: scorecard.verdict,
      scorecard,
      approvals: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await gateRef.set(gate);

    this.logger.log(
      `Evaluated release gate ${gateRef.id}: ${scorecard.verdict} (score: ${scorecard.overallScore})`,
    );

    return {
      gateId: gateRef.id,
      verdict: scorecard.verdict,
      scorecard,
    };
  }

  async approve(
    userId: string,
    gateId: string,
  ): Promise<{ status: string; approvalCount: number }> {
    const gateRef = this.db.doc(
      `users/${userId}/releaseGates/${gateId}`,
    );
    const doc = await gateRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Release gate ${gateId} not found`);
    }

    const gate = doc.data() as Omit<ReleaseGate, 'id'>;
    const approvals = gate.approvals || [];

    // Check if already approved by this user
    const alreadyApproved = approvals.some((a) => a.userId === userId);
    if (alreadyApproved) {
      return {
        status: 'ALREADY_APPROVED',
        approvalCount: approvals.length,
      };
    }

    approvals.push({ userId, approvedAt: new Date() });

    await gateRef.update({
      approvals,
      updatedAt: new Date(),
    });

    this.logger.log(`User ${userId} approved release gate ${gateId}`);

    return { status: 'APPROVED', approvalCount: approvals.length };
  }

  async getScorecard(
    userId: string,
    gateId: string,
  ): Promise<{
    gateId: string;
    verdict: string;
    scorecard: Scorecard;
    approvals: Array<{ userId: string; approvedAt: Date }>;
  }> {
    const doc = await this.db
      .doc(`users/${userId}/releaseGates/${gateId}`)
      .get();

    if (!doc.exists) {
      throw new NotFoundException(`Release gate ${gateId} not found`);
    }

    const gate = doc.data() as Omit<ReleaseGate, 'id'>;

    return {
      gateId,
      verdict: gate.verdict,
      scorecard: gate.scorecard,
      approvals: gate.approvals,
    };
  }

  private async aggregateTestPassRate(userId: string): Promise<number> {
    // Query recent test results to calculate pass rate
    try {
      const snapshot = await this.db
        .collection(`users/${userId}/flakeRecords`)
        .limit(100)
        .get();

      if (snapshot.empty) return 100;

      let totalPass = 0;
      let totalRuns = 0;

      for (const doc of snapshot.docs) {
        const data = doc.data();
        totalPass += data.passCount || 0;
        totalRuns += data.totalRuns || 0;
      }

      return totalRuns > 0 ? Math.round((totalPass / totalRuns) * 100) : 100;
    } catch {
      return 0;
    }
  }

  private async aggregateLatestCoverage(userId: string): Promise<number> {
    try {
      const snapshot = await this.db
        .collection(`users/${userId}/coverageReports`)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (snapshot.empty) return 0;

      const report = snapshot.docs[0].data();
      return report.linePercentage || 0;
    } catch {
      return 0;
    }
  }

  private async aggregateCriticalVulns(userId: string): Promise<number> {
    try {
      const snapshot = await this.db
        .collection(`users/${userId}/securityScans`)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (snapshot.empty) return 0;

      const scan = snapshot.docs[0].data();
      const findings = scan.findings || [];
      return findings.filter(
        (f: { severity: string }) => f.severity === 'critical',
      ).length;
    } catch {
      return 0;
    }
  }
}
