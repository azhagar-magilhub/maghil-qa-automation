import { Module } from '@nestjs/common';
import { EnvironmentController } from './environment.controller';
import { EnvironmentService } from './environment.service';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

@Module({
  controllers: [EnvironmentController],
  providers: [EnvironmentService, FirebaseAdminService],
  exports: [EnvironmentService],
})
export class EnvironmentModule {}
