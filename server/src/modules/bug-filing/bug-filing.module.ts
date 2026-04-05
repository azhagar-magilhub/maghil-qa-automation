import { Module } from '@nestjs/common';
import { BugFilingController } from './bug-filing.controller';
import { BugFilingService } from './bug-filing.service';
import { JiraModule } from '../jira/jira.module';
import { IntegrationModule } from '../integration/integration.module';

@Module({
  imports: [JiraModule, IntegrationModule],
  controllers: [BugFilingController],
  providers: [BugFilingService],
  exports: [BugFilingService],
})
export class BugFilingModule {}
