import { Module } from '@nestjs/common';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './scheduler.service';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

@Module({
  controllers: [SchedulerController],
  providers: [SchedulerService, FirebaseAdminService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
