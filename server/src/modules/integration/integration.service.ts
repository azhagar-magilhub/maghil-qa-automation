import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseAdminService } from '../../config/firebase-admin.config';
import { encrypt, decrypt } from '../../utils/encryption.util';
import { IntegrationType } from './dto/save-integration.dto';

@Injectable()
export class IntegrationService {
  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  private get db() {
    return this.firebaseAdmin.firestore();
  }

  async save(userId: string, type: IntegrationType, config: Record<string, string>) {
    const encryptedConfig = encrypt(JSON.stringify(config));
    const ref = this.db.doc(`users/${userId}/integrations/${type}`);
    await ref.set({
      type,
      encryptedConfig,
      isActive: true,
      lastTestedAt: null,
      lastTestStatus: null,
      updatedAt: new Date(),
    });
    return { type, isActive: true };
  }

  async getAll(userId: string) {
    const snapshot = await this.db.collection(`users/${userId}/integrations`).get();
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        type: data.type,
        isActive: data.isActive,
        lastTestedAt: data.lastTestedAt,
        lastTestStatus: data.lastTestStatus,
        updatedAt: data.updatedAt,
      };
    });
  }

  async getDecryptedConfig(userId: string, type: IntegrationType): Promise<Record<string, string>> {
    const doc = await this.db.doc(`users/${userId}/integrations/${type}`).get();
    if (!doc.exists) {
      throw new NotFoundException(`Integration ${type} not configured`);
    }
    const data = doc.data()!;
    return JSON.parse(decrypt(data.encryptedConfig));
  }

  async updateTestStatus(userId: string, type: IntegrationType, success: boolean) {
    const ref = this.db.doc(`users/${userId}/integrations/${type}`);
    await ref.update({
      lastTestedAt: new Date(),
      lastTestStatus: success,
    });
  }
}
