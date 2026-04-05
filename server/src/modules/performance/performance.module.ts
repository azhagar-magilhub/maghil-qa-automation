import { Module } from '@nestjs/common';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

@Module({
  controllers: [PerformanceController],
  providers: [PerformanceService, FirebaseAdminService],
  exports: [PerformanceService],
})
export class PerformanceModule {}
