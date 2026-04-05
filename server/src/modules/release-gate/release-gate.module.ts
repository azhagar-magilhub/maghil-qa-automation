import { Module } from '@nestjs/common';
import { ReleaseGateController } from './release-gate.controller';
import { ReleaseGateService } from './release-gate.service';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

@Module({
  controllers: [ReleaseGateController],
  providers: [ReleaseGateService, FirebaseAdminService],
  exports: [ReleaseGateService],
})
export class ReleaseGateModule {}
