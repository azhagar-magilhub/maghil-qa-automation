import { Module } from '@nestjs/common';
import { CicdController } from './cicd.controller';
import { CicdService } from './cicd.service';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

@Module({
  controllers: [CicdController],
  providers: [CicdService, FirebaseAdminService],
  exports: [CicdService],
})
export class CicdModule {}
