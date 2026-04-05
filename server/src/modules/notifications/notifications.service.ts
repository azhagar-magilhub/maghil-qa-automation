import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseAdminService } from '../../config/firebase-admin.config';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

interface Notification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  channel: 'IN_APP' | 'SLACK' | 'TEAMS' | 'EMAIL';
  read: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

interface NotificationPreferences {
  userId: string;
  channels: {
    inApp: boolean;
    slack: boolean;
    teams: boolean;
    email: boolean;
  };
  slackWebhookUrl?: string;
  teamsWebhookUrl?: string;
  emailAddress?: string;
  quietHoursStart?: string; // HH:mm
  quietHoursEnd?: string; // HH:mm
  notifyOn: {
    testRunComplete: boolean;
    testRunFailed: boolean;
    securityScanComplete: boolean;
    buildStatusChange: boolean;
    qualityGateFailed: boolean;
  };
  updatedAt?: Date;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  private get db() {
    return this.firebaseAdmin.firestore();
  }

  async send(
    userId: string,
    notification: Omit<Notification, 'id' | 'userId' | 'read' | 'createdAt'>,
  ): Promise<Notification> {
    const docRef = this.db.collection(`users/${userId}/notifications`).doc();

    const notifDoc: Omit<Notification, 'id'> = {
      userId,
      title: notification.title,
      message: notification.message,
      type: notification.type || 'INFO',
      channel: notification.channel || 'IN_APP',
      read: false,
      metadata: notification.metadata || {},
      createdAt: new Date(),
    };

    await docRef.set(notifDoc);
    this.logger.log(`Sent notification "${notification.title}" to user ${userId}`);

    return { id: docRef.id, ...notifDoc };
  }

  async sendSlack(
    webhookUrl: string,
    message: { text: string; channel?: string; username?: string; icon_emoji?: string },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.httpPost(webhookUrl, {
        text: message.text,
        channel: message.channel,
        username: message.username || 'QA Automation Bot',
        icon_emoji: message.icon_emoji || ':robot_face:',
      });
      this.logger.log('Slack notification sent successfully');
      return { success: true };
    } catch (err) {
      this.logger.error(`Failed to send Slack notification: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async sendTeamsWebhook(
    webhookUrl: string,
    message: { title: string; text: string; themeColor?: string },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const card = {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: message.themeColor || '0076D7',
        summary: message.title,
        sections: [
          {
            activityTitle: message.title,
            activitySubtitle: new Date().toISOString(),
            text: message.text,
            markdown: true,
          },
        ],
      };

      await this.httpPost(webhookUrl, card);
      this.logger.log('Teams notification sent successfully');
      return { success: true };
    } catch (err) {
      this.logger.error(`Failed to send Teams notification: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const doc = await this.db
      .doc(`users/${userId}/settings/notificationPreferences`)
      .get();

    if (!doc.exists) {
      // Return default preferences
      return {
        userId,
        channels: {
          inApp: true,
          slack: false,
          teams: false,
          email: false,
        },
        notifyOn: {
          testRunComplete: true,
          testRunFailed: true,
          securityScanComplete: true,
          buildStatusChange: true,
          qualityGateFailed: true,
        },
      };
    }

    return doc.data() as NotificationPreferences;
  }

  async updatePreferences(
    userId: string,
    prefs: Partial<Omit<NotificationPreferences, 'userId' | 'updatedAt'>>,
  ): Promise<NotificationPreferences> {
    const docRef = this.db.doc(`users/${userId}/settings/notificationPreferences`);

    const updateData = {
      ...prefs,
      userId,
      updatedAt: new Date(),
    };

    await docRef.set(updateData, { merge: true });
    this.logger.log(`Updated notification preferences for user ${userId}`);

    const updated = await docRef.get();
    return updated.data() as NotificationPreferences;
  }

  // ---------- HTTP helper ----------

  private httpPost(targetUrl: string, body: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = new URL(targetUrl);
      const isHttps = url.protocol === 'https:';
      const transport = isHttps ? https : http;
      const payload = JSON.stringify(body);

      const req = transport.request(
        {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload).toString(),
          },
          timeout: 10000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve();
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
            }
          });
        },
      );

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });

      req.write(payload);
      req.end();
    });
  }
}
