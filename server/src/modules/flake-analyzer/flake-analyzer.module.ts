import { Module } from '@nestjs/common';
import { FlakeAnalyzerController } from './flake-analyzer.controller';
import { FlakeAnalyzerService } from './flake-analyzer.service';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

@Module({
  controllers: [FlakeAnalyzerController],
  providers: [FlakeAnalyzerService, FirebaseAdminService],
  exports: [FlakeAnalyzerService],
})
export class FlakeAnalyzerModule {}
