import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

interface WebhookConfig {
  name: string;
  direction: 'incoming' | 'outgoing';
  url: string;
  events: string[];
  enabled?: boolean;
}

interface WebhookDoc {
  userId: string;
  name: string;
  direction: 'incoming' | 'outgoing';
  url: string;
  events: string[];
  enabled: boolean;
  status: 'active' | 'inactive' | 'error';
  lastTriggered: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  private get db() {
    return this.firebaseAdmin.firestore();
  }

  async create(
    userId: string,
    config: WebhookConfig,
  ): Promise<{ id: string; webhook: WebhookDoc }> {
    if (!config.name) {
      throw new BadRequestException('Webhook name is required');
    }

    const webhook: WebhookDoc = {
      userId,
      name: config.name,
      direction: config.direction,
      url: config.url,
      events: config.events || [],
      enabled: config.enabled !== false,
      status: 'active',
      lastTriggered: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const ref = await this.db.collection('webhooks').add(webhook);

    this.logger.log(
      `Created ${config.direction} webhook "${config.name}" (${ref.id}) for user ${userId}`,
    );

    return { id: ref.id, webhook };
  }

  async list(
    userId: string,
  ): Promise<Array<WebhookDoc & { id: string }>> {
    const snapshot = await this.db
      .collection('webhooks')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as WebhookDoc),
    }));
  }

  async update(
    userId: string,
    webhookId: string,
    updates: Partial<WebhookConfig>,
  ): Promise<{ id: string; status: string }> {
    const ref = this.db.collection('webhooks').doc(webhookId);
    const doc = await ref.get();

    if (!doc.exists) {
      throw new NotFoundException(`Webhook ${webhookId} not found`);
    }

    const data = doc.data() as WebhookDoc;
    if (data.userId !== userId) {
      throw new NotFoundException(`Webhook ${webhookId} not found`);
    }

    await ref.update({
      ...updates,
      updatedAt: new Date(),
    });

    this.logger.log(`Updated webhook ${webhookId} for user ${userId}`);

    return { id: webhookId, status: 'updated' };
  }

  async delete(
    userId: string,
    webhookId: string,
  ): Promise<{ id: string; status: string }> {
    const ref = this.db.collection('webhooks').doc(webhookId);
    const doc = await ref.get();

    if (!doc.exists) {
      throw new NotFoundException(`Webhook ${webhookId} not found`);
    }

    const data = doc.data() as WebhookDoc;
    if (data.userId !== userId) {
      throw new NotFoundException(`Webhook ${webhookId} not found`);
    }

    await ref.delete();

    this.logger.log(`Deleted webhook ${webhookId} for user ${userId}`);

    return { id: webhookId, status: 'deleted' };
  }

  async test(
    userId: string,
    webhookId: string,
  ): Promise<{ status: string; statusCode: number; response: string }> {
    const ref = this.db.collection('webhooks').doc(webhookId);
    const doc = await ref.get();

    if (!doc.exists) {
      throw new NotFoundException(`Webhook ${webhookId} not found`);
    }

    const webhook = doc.data() as WebhookDoc;
    if (webhook.userId !== userId) {
      throw new NotFoundException(`Webhook ${webhookId} not found`);
    }

    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      source: 'qa-automation-platform',
      data: {
        message: 'This is a test webhook delivery',
        webhookId,
        userId,
      },
    };

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      });

      await ref.update({
        lastTriggered: new Date(),
        status: response.ok ? 'active' : 'error',
        updatedAt: new Date(),
      });

      this.logger.log(
        `Test webhook ${webhookId}: ${response.status} ${response.statusText}`,
      );

      return {
        status: response.ok ? 'delivered' : 'failed',
        statusCode: response.status,
        response: response.statusText,
      };
    } catch (error) {
      await ref.update({
        status: 'error',
        updatedAt: new Date(),
      });

      this.logger.error(`Test webhook ${webhookId} failed: ${error}`);

      return {
        status: 'failed',
        statusCode: 0,
        response: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  async receive(
    webhookId: string,
    payload: Record<string, unknown>,
  ): Promise<{ status: string; processed: boolean }> {
    const ref = this.db.collection('webhooks').doc(webhookId);
    const doc = await ref.get();

    if (!doc.exists) {
      throw new NotFoundException(`Webhook ${webhookId} not found`);
    }

    const webhook = doc.data() as WebhookDoc;

    if (!webhook.enabled) {
      return { status: 'disabled', processed: false };
    }

    // Log the incoming event
    await this.db.collection('webhookEvents').add({
      webhookId,
      userId: webhook.userId,
      payload,
      receivedAt: new Date(),
    });

    // Update last triggered timestamp
    await ref.update({
      lastTriggered: new Date(),
      updatedAt: new Date(),
    });

    this.logger.log(
      `Received incoming webhook ${webhookId} for user ${webhook.userId}`,
    );

    return { status: 'received', processed: true };
  }
}
