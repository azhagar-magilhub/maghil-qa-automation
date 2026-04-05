import { Global, Injectable, Module, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private app: admin.app.App;

  onModuleInit() {
    if (admin.apps.length === 0) {
      // Use explicit credentials if provided, otherwise Application Default Credentials (Cloud Run)
      if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        this.app = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
        });
      } else {
        // Application Default Credentials — works on Cloud Run automatically
        this.app = admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || 'maghil-work-space',
        });
      }
    } else {
      this.app = admin.apps[0]!;
    }
  }

  auth(): admin.auth.Auth {
    return this.app.auth();
  }

  firestore(): admin.firestore.Firestore {
    return (this.app as any).firestore('maghilqa');
  }

  storage(): admin.storage.Storage {
    return this.app.storage();
  }
}

@Global()
@Module({
  providers: [FirebaseAdminService],
  exports: [FirebaseAdminService],
})
export class FirebaseAdminModule {}
