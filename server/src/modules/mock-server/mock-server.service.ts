import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

interface MockConfig {
  method: string;
  path: string;
  statusCode: number;
  headers: Record<string, string>;
  responseBody: string;
  delay: number;
  enabled: boolean;
  conditionalResponses?: Array<{
    matchField: string;
    matchValue: string;
    responseBody: string;
    statusCode: number;
  }>;
}

@Injectable()
export class MockServerService {
  private readonly logger = new Logger(MockServerService.name);

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  private get db() {
    return this.firebaseAdmin.firestore();
  }

  async createMock(userId: string, config: MockConfig) {
    const docRef = this.db.collection('mockEndpoints').doc();
    const data = {
      ...config,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await docRef.set(data);
    this.logger.log(`Mock created: ${config.method} ${config.path} by user ${userId}`);
    return { id: docRef.id, ...data };
  }

  async listMocks(userId: string) {
    const snapshot = await this.db
      .collection('mockEndpoints')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  async updateMock(mockId: string, updates: Partial<MockConfig>) {
    const docRef = this.db.collection('mockEndpoints').doc(mockId);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Mock endpoint ${mockId} not found`);
    }
    await docRef.update({ ...updates, updatedAt: new Date() });
    return { id: mockId, ...doc.data(), ...updates };
  }

  async deleteMock(mockId: string) {
    const docRef = this.db.collection('mockEndpoints').doc(mockId);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Mock endpoint ${mockId} not found`);
    }
    await docRef.delete();
    return { deleted: true, id: mockId };
  }

  async serveMock(mockId: string, requestBody?: Record<string, unknown>) {
    const docRef = this.db.collection('mockEndpoints').doc(mockId);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Mock endpoint ${mockId} not found`);
    }

    const mock = doc.data() as MockConfig & { userId: string };

    if (!mock.enabled) {
      throw new NotFoundException('Mock endpoint is disabled');
    }

    // Check conditional responses
    if (mock.conditionalResponses && requestBody) {
      for (const condition of mock.conditionalResponses) {
        if (requestBody[condition.matchField] === condition.matchValue) {
          return {
            statusCode: condition.statusCode,
            headers: mock.headers || {},
            body: condition.responseBody,
            delay: mock.delay || 0,
          };
        }
      }
    }

    // Add delay if configured
    if (mock.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, mock.delay));
    }

    return {
      statusCode: mock.statusCode,
      headers: mock.headers || {},
      body: mock.responseBody,
      delay: mock.delay || 0,
    };
  }
}
