import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseAdminService } from '../../config/firebase-admin.config';
import * as crypto from 'crypto';

interface LogSourceConfig {
  id?: string;
  userId: string;
  name: string;
  type: 'CLOUD_LOGGING' | 'ELK' | 'FILE';
  connectionUrl?: string;
  projectId?: string;
  indexPattern?: string;
  filePath?: string;
  credentials?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

interface LogSearchQuery {
  sourceId: string;
  pattern?: string;
  severity?: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  from?: string;
  to?: string;
  limit?: number;
}

interface LogEntry {
  id: string;
  timestamp: string;
  severity: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  source: string;
  metadata?: Record<string, unknown>;
}

interface ErrorGroup {
  fingerprint: string;
  message: string;
  count: number;
  severity: string;
  firstSeen: string;
  lastSeen: string;
  sampleEntries: LogEntry[];
}

@Injectable()
export class LogAnalyzerService {
  private readonly logger = new Logger(LogAnalyzerService.name);

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  private get db() {
    return this.firebaseAdmin.firestore();
  }

  async connect(
    userId: string,
    config: Omit<LogSourceConfig, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
  ): Promise<LogSourceConfig> {
    const docRef = this.db.collection(`users/${userId}/logSources`).doc();

    const sourceDoc: Omit<LogSourceConfig, 'id'> = {
      userId,
      name: config.name,
      type: config.type,
      connectionUrl: config.connectionUrl,
      projectId: config.projectId,
      indexPattern: config.indexPattern,
      filePath: config.filePath,
      credentials: config.credentials,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await docRef.set(sourceDoc);
    this.logger.log(`Connected log source "${config.name}" (${config.type}) for user ${userId}`);

    return { id: docRef.id, ...sourceDoc };
  }

  async search(
    userId: string,
    query: LogSearchQuery,
  ): Promise<{ entries: LogEntry[]; total: number; query: LogSearchQuery }> {
    // Verify source exists
    const sourceDoc = await this.db
      .doc(`users/${userId}/logSources/${query.sourceId}`)
      .get();

    if (!sourceDoc.exists) {
      throw new NotFoundException(`Log source ${query.sourceId} not found`);
    }

    const source = sourceDoc.data() as LogSourceConfig;
    const limit = Math.min(query.limit || 50, 500);

    // Stub: Generate sample log entries matching the query
    const entries = this.generateSampleLogs(source, query, limit);

    return {
      entries,
      total: entries.length,
      query,
    };
  }

  async getErrorGroups(
    userId: string,
    sourceId: string,
  ): Promise<{ sourceId: string; groups: ErrorGroup[]; total: number }> {
    // Verify source exists
    const sourceDoc = await this.db
      .doc(`users/${userId}/logSources/${sourceId}`)
      .get();

    if (!sourceDoc.exists) {
      throw new NotFoundException(`Log source ${sourceId} not found`);
    }

    // Stub: Generate sample error groups
    const groups = this.generateSampleErrorGroups();

    return {
      sourceId,
      groups,
      total: groups.length,
    };
  }

  // ---------- Stub data generators ----------

  private generateSampleLogs(
    source: LogSourceConfig,
    query: LogSearchQuery,
    limit: number,
  ): LogEntry[] {
    const severities: Array<'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'> = query.severity
      ? [query.severity]
      : ['DEBUG', 'INFO', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];

    const sampleMessages = {
      DEBUG: [
        'Processing request for /api/users',
        'Cache miss for key: session_abc123',
        'Database query executed in 45ms',
        'Middleware chain completed',
        'Loaded configuration from environment',
      ],
      INFO: [
        'Server started on port 3000',
        'User login successful: user@example.com',
        'Scheduled job completed: cleanup_expired_sessions',
        'API response sent: 200 OK',
        'Health check passed',
      ],
      WARNING: [
        'Response time exceeded threshold: 2500ms',
        'Deprecated API version v1 accessed',
        'Rate limit approaching: 85% capacity',
        'Certificate expiring in 14 days',
        'Memory usage at 80%',
      ],
      ERROR: [
        'Database connection failed: ETIMEDOUT',
        'Unhandled exception in /api/orders: NullPointerException',
        'Authentication token expired for session xyz789',
        'Failed to process payment: gateway_timeout',
        'File not found: /uploads/document.pdf',
      ],
      CRITICAL: [
        'Database cluster unreachable',
        'Out of memory: heap space exceeded',
        'SSL certificate expired',
        'Disk space critical: 2% remaining',
        'Primary replica failover initiated',
      ],
    };

    const entries: LogEntry[] = [];
    const fromTs = query.from ? new Date(query.from).getTime() : Date.now() - 24 * 60 * 60 * 1000;
    const toTs = query.to ? new Date(query.to).getTime() : Date.now();

    for (let i = 0; i < limit; i++) {
      const severity = severities[Math.floor(Math.random() * severities.length)];
      const messages = sampleMessages[severity];
      let message = messages[Math.floor(Math.random() * messages.length)];

      // Filter by pattern if specified
      if (query.pattern && !message.toLowerCase().includes(query.pattern.toLowerCase())) {
        // Generate a matching message
        message = `${message} [matched: ${query.pattern}]`;
      }

      const ts = fromTs + Math.random() * (toTs - fromTs);

      entries.push({
        id: crypto.randomUUID(),
        timestamp: new Date(ts).toISOString(),
        severity,
        message,
        source: source.name,
        metadata: {
          sourceType: source.type,
          hostname: `server-${Math.floor(Math.random() * 5) + 1}`,
          pid: Math.floor(Math.random() * 50000) + 1000,
        },
      });
    }

    // Sort by timestamp descending
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return entries;
  }

  private generateSampleErrorGroups(): ErrorGroup[] {
    const errorPatterns = [
      {
        message: 'Database connection failed: ETIMEDOUT',
        count: 42,
        severity: 'ERROR',
      },
      {
        message: 'NullPointerException in OrderService.processPayment',
        count: 28,
        severity: 'ERROR',
      },
      {
        message: 'Authentication token expired',
        count: 156,
        severity: 'WARNING',
      },
      {
        message: 'Out of memory: heap space exceeded',
        count: 3,
        severity: 'CRITICAL',
      },
      {
        message: 'HTTP 503 Service Unavailable from upstream',
        count: 17,
        severity: 'ERROR',
      },
      {
        message: 'SSL handshake failure with external API',
        count: 8,
        severity: 'ERROR',
      },
      {
        message: 'Disk space warning: below 10% threshold',
        count: 5,
        severity: 'CRITICAL',
      },
    ];

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    return errorPatterns.map((pattern) => {
      const fingerprint = crypto
        .createHash('sha256')
        .update(pattern.message)
        .digest('hex')
        .slice(0, 16);

      const firstSeenDaysAgo = Math.floor(Math.random() * 30) + 1;
      const lastSeenHoursAgo = Math.floor(Math.random() * 24);

      return {
        fingerprint,
        message: pattern.message,
        count: pattern.count,
        severity: pattern.severity,
        firstSeen: new Date(now - firstSeenDaysAgo * dayMs).toISOString(),
        lastSeen: new Date(now - lastSeenHoursAgo * 60 * 60 * 1000).toISOString(),
        sampleEntries: [
          {
            id: crypto.randomUUID(),
            timestamp: new Date(now - lastSeenHoursAgo * 60 * 60 * 1000).toISOString(),
            severity: pattern.severity as LogEntry['severity'],
            message: pattern.message,
            source: 'sample-source',
            metadata: {
              hostname: `server-${Math.floor(Math.random() * 5) + 1}`,
              stackTrace: `Error: ${pattern.message}\n    at Module.process (/app/src/service.ts:42:15)\n    at async Handler.handle (/app/src/handler.ts:18:5)`,
            },
          },
        ],
      };
    });
  }
}
