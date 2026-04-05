import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

@Module({
  controllers: [AiController],
  providers: [AiService, FirebaseAdminService],
  exports: [AiService],
})
export class AiModule {}
