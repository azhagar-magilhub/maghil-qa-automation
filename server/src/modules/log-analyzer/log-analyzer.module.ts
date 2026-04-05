import { Module } from '@nestjs/common';
import { LogAnalyzerController } from './log-analyzer.controller';
import { LogAnalyzerService } from './log-analyzer.service';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

@Module({
  controllers: [LogAnalyzerController],
  providers: [LogAnalyzerService, FirebaseAdminService],
  exports: [LogAnalyzerService],
})
export class LogAnalyzerModule {}
