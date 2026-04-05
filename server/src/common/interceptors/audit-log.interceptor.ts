import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logAction(user?.uid, method, url, 'SUCCESS', Date.now() - startTime);
        },
        error: (error) => {
          this.logAction(user?.uid, method, url, 'FAILURE', Date.now() - startTime, error.message);
        },
      }),
    );
  }

  private async logAction(
    userId: string | undefined,
    method: string,
    url: string,
    status: 'SUCCESS' | 'FAILURE',
    duration: number,
    errorMsg?: string,
  ) {
    try {
      const db = this.firebaseAdmin.firestore();
      await db.collection('auditLogs').add({
        userId: userId || null,
        action: `${method} ${url}`,
        details: { duration, errorMsg: errorMsg || null },
        status,
        createdAt: new Date(),
      });
    } catch {
      // Silently fail — audit logging should not break the request
    }
  }
}
