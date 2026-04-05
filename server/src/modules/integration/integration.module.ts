import { Module } from '@nestjs/common';
import { IntegrationController } from './integration.controller';
import { IntegrationService } from './integration.service';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

@Module({
  controllers: [IntegrationController],
  providers: [IntegrationService, FirebaseAdminService],
  exports: [IntegrationService],
})
export class IntegrationModule {}
