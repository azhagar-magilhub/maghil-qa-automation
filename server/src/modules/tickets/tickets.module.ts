import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { JiraModule } from '../jira/jira.module';
import { IntegrationModule } from '../integration/integration.module';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

@Module({
  imports: [JiraModule, IntegrationModule],
  controllers: [TicketsController],
  providers: [TicketsService, FirebaseAdminService],
  exports: [TicketsService],
})
export class TicketsModule {}
