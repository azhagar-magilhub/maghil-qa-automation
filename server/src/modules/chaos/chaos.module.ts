import { Module } from '@nestjs/common';
import { ChaosController } from './chaos.controller';
import { ChaosService } from './chaos.service';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

@Module({
  controllers: [ChaosController],
  providers: [ChaosService, FirebaseAdminService],
  exports: [ChaosService],
})
export class ChaosModule {}
