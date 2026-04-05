import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseAdminService } from '../../config/firebase-admin.config';
import { analyzeHeaders, SecurityFinding } from './scanners/header-analyzer';
import { checkSSL, SSLReport } from './scanners/ssl-checker';
import { scanPorts } from './scanners/port-scanner';

interface SecurityScan {
  id: string;
  userId: string;
  targetUrl: string;
  scanType: 'FULL' | 'HEADERS' | 'SSL';
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  findings: SecurityFinding[];
  headerReport?: Awaited<ReturnType<typeof analyzeHeaders>>;
  sslReport?: SSLReport;
  portReport?: Awaited<ReturnType<typeof scanPorts>>;
  score: number;
  createdAt: Date;
  completedAt?: Date;
}

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  private get db() {
    return this.firebaseAdmin.firestore();
  }

  async scanHeaders(
    userId: string,
    targetUrl: string,
  ): Promise<Awaited<ReturnType<typeof analyzeHeaders>>> {
    this.logger.log(`Scanning headers for ${targetUrl}`);
    return analyzeHeaders(targetUrl);
  }

  async checkSSL(
    userId: string,
    targetUrl: string,
  ): Promise<SSLReport> {
    this.logger.log(`Checking SSL for ${targetUrl}`);
    return checkSSL(targetUrl);
  }

  async scanOWASP(
    userId: string,
    targetUrl: string,
    scanType: 'FULL' | 'HEADERS' | 'SSL' = 'FULL',
  ): Promise<{ scanId: string; status: string }> {
    const scanRef = this.db
      .collection(`users/${userId}/securityScans`)
      .doc();

    const scan: Omit<SecurityScan, 'id'> = {
      userId,
      targetUrl,
      scanType,
      status: 'RUNNING',
      findings: [],
      score: 0,
      createdAt: new Date(),
    };

    await scanRef.set(scan);

    this.logger.log(
      `Created security scan ${scanRef.id} for ${targetUrl} (type: ${scanType})`,
    );

    // Run scan asynchronously
    this.executeScan(userId, scanRef.id, targetUrl, scanType).catch(
      (err) => {
        this.logger.error(
          `Security scan ${scanRef.id} failed: ${err.message}`,
        );
      },
    );

    return { scanId: scanRef.id, status: 'RUNNING' };
  }

  private async executeScan(
    userId: string,
    scanId: string,
    targetUrl: string,
    scanType: 'FULL' | 'HEADERS' | 'SSL',
  ): Promise<void> {
    const scanRef = this.db.doc(
      `users/${userId}/securityScans/${scanId}`,
    );

    try {
      const allFindings: SecurityFinding[] = [];
      const updateData: Record<string, unknown> = {};

      // Header analysis
      if (scanType === 'FULL' || scanType === 'HEADERS') {
        try {
          const headerReport = await analyzeHeaders(targetUrl);
          allFindings.push(...headerReport.findings);
          updateData.headerReport = headerReport;
        } catch (err) {
          this.logger.warn(`Header scan failed for ${targetUrl}: ${err.message}`);
          allFindings.push({
            header: 'header-scan',
            status: 'missing',
            severity: 'medium',
            value: null,
            recommendation: `Header scan failed: ${err.message}`,
          });
        }
      }

      // SSL check
      if (scanType === 'FULL' || scanType === 'SSL') {
        try {
          const sslReport = await checkSSL(targetUrl);
          updateData.sslReport = sslReport;

          for (const warning of sslReport.warnings) {
            allFindings.push({
              header: 'ssl',
              status: 'misconfigured',
              severity: sslReport.expired ? 'critical' : 'high',
              value: warning,
              recommendation: warning,
            });
          }

          if (sslReport.valid && sslReport.warnings.length === 0) {
            allFindings.push({
              header: 'ssl',
              status: 'present',
              severity: 'info',
              value: `Valid certificate, expires in ${sslReport.daysUntilExpiry} days`,
              recommendation: 'SSL certificate is properly configured.',
            });
          }
        } catch (err) {
          this.logger.warn(`SSL check failed for ${targetUrl}: ${err.message}`);
          allFindings.push({
            header: 'ssl',
            status: 'missing',
            severity: 'high',
            value: null,
            recommendation: `SSL check failed: ${err.message}`,
          });
        }
      }

      // Port scan (only for FULL scans)
      if (scanType === 'FULL') {
        try {
          const portReport = await scanPorts(targetUrl);
          updateData.portReport = portReport;

          for (const warning of portReport.warnings) {
            allFindings.push({
              header: 'ports',
              status: 'misconfigured',
              severity: 'high',
              value: warning,
              recommendation: warning,
            });
          }
        } catch (err) {
          this.logger.warn(`Port scan failed for ${targetUrl}: ${err.message}`);
        }
      }

      // Calculate overall score
      const criticalCount = allFindings.filter(
        (f) => f.severity === 'critical',
      ).length;
      const highCount = allFindings.filter(
        (f) => f.severity === 'high',
      ).length;
      const mediumCount = allFindings.filter(
        (f) => f.severity === 'medium',
      ).length;
      const totalIssues =
        criticalCount * 20 + highCount * 10 + mediumCount * 5;
      const score = Math.max(0, 100 - totalIssues);

      await scanRef.update({
        status: 'COMPLETED',
        findings: allFindings,
        score,
        completedAt: new Date(),
        ...updateData,
      });
    } catch (err) {
      await scanRef.update({
        status: 'FAILED',
        completedAt: new Date(),
      });
      throw err;
    }
  }

  async getScan(
    userId: string,
    scanId: string,
  ): Promise<SecurityScan> {
    const doc = await this.db
      .doc(`users/${userId}/securityScans/${scanId}`)
      .get();

    if (!doc.exists) {
      throw new NotFoundException(`Security scan ${scanId} not found`);
    }

    return { id: doc.id, ...doc.data() } as SecurityScan;
  }

  async listScans(userId: string): Promise<SecurityScan[]> {
    const snapshot = await this.db
      .collection(`users/${userId}/securityScans`)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SecurityScan[];
  }
}
