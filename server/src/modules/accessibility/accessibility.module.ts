import { Module } from '@nestjs/common';
import { AccessibilityController } from './accessibility.controller';
import { AccessibilityService } from './accessibility.service';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

@Module({
  controllers: [AccessibilityController],
  providers: [AccessibilityService, FirebaseAdminService],
  exports: [AccessibilityService],
})
export class AccessibilityModule {}
