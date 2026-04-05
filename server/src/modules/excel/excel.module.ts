import { Module } from '@nestjs/common';
import { ExcelController } from './excel.controller';
import { ExcelService } from './excel.service';
import { IntegrationModule } from '../integration/integration.module';
import { JiraModule } from '../jira/jira.module';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

@Module({
  imports: [IntegrationModule, JiraModule],
  controllers: [ExcelController],
  providers: [ExcelService, FirebaseAdminService],
  exports: [ExcelService],
})
export class ExcelModule {}
