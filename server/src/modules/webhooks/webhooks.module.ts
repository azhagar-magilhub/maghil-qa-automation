import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService, FirebaseAdminService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
