import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseAdminService } from '../../config/firebase-admin.config';
import * as crypto from 'crypto';

interface TriggerConfig {
  collectionId: string;
  type: 'SMOKE' | 'REGRESSION' | 'FULL' | 'CUSTOM';
  environment: string;
  notifyOnComplete?: boolean;
}

interface TestRun {
  id?: string;
  userId: string;
  collectionId: string;
  type: string;
  environment: string;
  status: 'QUEUED' | 'RUNNING' | 'PASSED' | 'FAILED' | 'CANCELLED';
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  startedAt: Date;
  completedAt?: Date;
  qualityGate?: QualityGateResult;
}

interface BuildRecord {
  id?: string;
  source: 'GITHUB' | 'JENKINS' | 'GITLAB' | 'BITBUCKET' | 'UNKNOWN';
  repository: string;
  branch: string;
  commitSha: string;
  commitMessage?: string;
  author?: string;
  buildNumber?: string;
  buildUrl?: string;
  status: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'CANCELLED';
  triggeredAt: Date;
  receivedAt: Date;
}

interface QualityGateResult {
  passed: boolean;
  details: {
    criterion: string;
    threshold: number;
    actual: number;
    passed: boolean;
  }[];
}

@Injectable()
export class CicdService {
  private readonly logger = new Logger(CicdService.name);

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  private get db() {
    return this.firebaseAdmin.firestore();
  }

  async triggerTestRun(
    userId: string,
    config: TriggerConfig,
  ): Promise<{ runId: string; status: string; statusUrl: string }> {
    const runRef = this.db.collection(`users/${userId}/testRuns`).doc();

    const run: Omit<TestRun, 'id'> = {
      userId,
      collectionId: config.collectionId,
      type: config.type,
      environment: config.environment,
      status: 'QUEUED',
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      startedAt: new Date(),
    };

    await runRef.set(run);
    this.logger.log(
      `Triggered test run ${runRef.id} (type: ${config.type}, env: ${config.environment})`,
    );

    // Simulate async test execution
    this.simulateTestRun(userId, runRef.id).catch((err) => {
      this.logger.error(`Test run ${runRef.id} simulation failed: ${err.message}`);
    });

    return {
      runId: runRef.id,
      status: 'QUEUED',
      statusUrl: `/cicd/gate/${runRef.id}`,
    };
  }

  private async simulateTestRun(userId: string, runId: string): Promise<void> {
    const runRef = this.db.doc(`users/${userId}/testRuns/${runId}`);

    await runRef.update({ status: 'RUNNING' });

    // Simulate test execution with random results
    const totalTests = Math.floor(Math.random() * 50) + 10;
    const failRate = Math.random() * 0.2; // up to 20% failure
    const failed = Math.floor(totalTests * failRate);
    const skipped = Math.floor(Math.random() * 3);
    const passed = totalTests - failed - skipped;

    const passRate = (passed / totalTests) * 100;
    const qualityGate: QualityGateResult = {
      passed: passRate >= 80 && failed <= 5,
      details: [
        {
          criterion: 'Pass Rate >= 80%',
          threshold: 80,
          actual: Math.round(passRate * 100) / 100,
          passed: passRate >= 80,
        },
        {
          criterion: 'Max Failed Tests <= 5',
          threshold: 5,
          actual: failed,
          passed: failed <= 5,
        },
        {
          criterion: 'No Skipped Tests > 10%',
          threshold: 10,
          actual: Math.round((skipped / totalTests) * 10000) / 100,
          passed: (skipped / totalTests) * 100 <= 10,
        },
      ],
    };

    await runRef.update({
      status: qualityGate.passed ? 'PASSED' : 'FAILED',
      totalTests,
      passed,
      failed,
      skipped,
      completedAt: new Date(),
      qualityGate,
    });
  }

  async receiveWebhook(
    payload: Record<string, unknown>,
  ): Promise<{ buildId: string; source: string }> {
    const source = this.detectSource(payload);
    const buildRecord = this.parseWebhookPayload(source, payload);

    const docRef = this.db.collection('builds').doc();
    await docRef.set(buildRecord);

    this.logger.log(
      `Received ${source} webhook for ${buildRecord.repository}@${buildRecord.branch}`,
    );

    return { buildId: docRef.id, source };
  }

  private detectSource(
    payload: Record<string, unknown>,
  ): 'GITHUB' | 'JENKINS' | 'GITLAB' | 'BITBUCKET' | 'UNKNOWN' {
    if (payload.action && payload.repository && payload.sender) return 'GITHUB';
    if (payload.object_kind && payload.project) return 'GITLAB';
    if (payload.build && (payload as any).build?.phase) return 'JENKINS';
    if (payload.push && payload.repository) return 'BITBUCKET';
    return 'UNKNOWN';
  }

  private parseWebhookPayload(
    source: string,
    payload: Record<string, unknown>,
  ): Omit<BuildRecord, 'id'> {
    const now = new Date();

    switch (source) {
      case 'GITHUB': {
        const repo = payload.repository as Record<string, unknown>;
        const headCommit = payload.head_commit as Record<string, unknown>;
        return {
          source: 'GITHUB',
          repository: (repo?.full_name as string) || 'unknown',
          branch: ((payload.ref as string) || '').replace('refs/heads/', ''),
          commitSha: (payload.after as string) || '',
          commitMessage: (headCommit?.message as string) || '',
          author: ((headCommit?.author as Record<string, unknown>)?.name as string) || '',
          status: 'SUCCESS',
          triggeredAt: now,
          receivedAt: now,
        };
      }
      case 'GITLAB': {
        const project = payload.project as Record<string, unknown>;
        const commits = (payload.commits as Record<string, unknown>[]) || [];
        return {
          source: 'GITLAB',
          repository: (project?.path_with_namespace as string) || 'unknown',
          branch: (payload.ref as string) || '',
          commitSha: (payload.checkout_sha as string) || '',
          commitMessage: commits.length > 0 ? (commits[0].message as string) : '',
          author: (payload.user_name as string) || '',
          status: 'SUCCESS',
          triggeredAt: now,
          receivedAt: now,
        };
      }
      case 'JENKINS': {
        const build = payload.build as Record<string, unknown>;
        return {
          source: 'JENKINS',
          repository: (payload.name as string) || 'unknown',
          branch: 'main',
          commitSha: '',
          buildNumber: (build?.number as string) || '',
          buildUrl: (build?.full_url as string) || '',
          status: (build?.status as string) === 'SUCCESS' ? 'SUCCESS' : 'FAILURE',
          triggeredAt: now,
          receivedAt: now,
        };
      }
      default:
        return {
          source: 'UNKNOWN',
          repository: 'unknown',
          branch: 'unknown',
          commitSha: '',
          status: 'PENDING',
          triggeredAt: now,
          receivedAt: now,
        };
    }
  }

  async checkGate(
    userId: string,
    runId: string,
  ): Promise<{ runId: string; status: string; passed: boolean | null; details: unknown }> {
    const doc = await this.db.doc(`users/${userId}/testRuns/${runId}`).get();

    if (!doc.exists) {
      throw new NotFoundException(`Test run ${runId} not found`);
    }

    const run = doc.data() as TestRun;

    if (run.status === 'QUEUED' || run.status === 'RUNNING') {
      return {
        runId,
        status: run.status,
        passed: null,
        details: { message: 'Test run is still in progress' },
      };
    }

    return {
      runId,
      status: run.status,
      passed: run.qualityGate?.passed ?? false,
      details: run.qualityGate || { message: 'No quality gate data available' },
    };
  }

  async postPRComment(
    userId: string,
    config: {
      owner: string;
      repo: string;
      prNumber: number;
      runId: string;
      token?: string;
    },
  ): Promise<{ success: boolean; message: string }> {
    // Stub: In production, this would call the GitHub API
    this.logger.log(
      `[STUB] Would post PR comment to ${config.owner}/${config.repo}#${config.prNumber} for run ${config.runId}`,
    );

    // Build the comment body from the test run
    let commentBody = '## QA Automation Test Results\n\n';

    try {
      const doc = await this.db
        .doc(`users/${userId}/testRuns/${config.runId}`)
        .get();

      if (doc.exists) {
        const run = doc.data() as TestRun;
        const emoji = run.status === 'PASSED' ? 'white_check_mark' : 'x';
        commentBody += `**Status:** :${emoji}: ${run.status}\n`;
        commentBody += `**Total:** ${run.totalTests} | **Passed:** ${run.passed} | **Failed:** ${run.failed} | **Skipped:** ${run.skipped}\n\n`;

        if (run.qualityGate) {
          commentBody += `### Quality Gate: ${run.qualityGate.passed ? 'PASSED' : 'FAILED'}\n`;
          for (const detail of run.qualityGate.details) {
            const mark = detail.passed ? 'check' : 'x';
            commentBody += `- :${mark}: ${detail.criterion} (actual: ${detail.actual})\n`;
          }
        }
      }
    } catch {
      commentBody += 'Unable to retrieve test run details.\n';
    }

    return {
      success: true,
      message: `[STUB] PR comment prepared for ${config.owner}/${config.repo}#${config.prNumber}. Body: ${commentBody}`,
    };
  }
}
