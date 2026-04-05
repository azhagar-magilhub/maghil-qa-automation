import { Module } from '@nestjs/common';
import { ConfluenceController } from './confluence.controller';
import { ConfluenceService } from './confluence.service';
import { IntegrationModule } from '../integration/integration.module';

@Module({
  imports: [IntegrationModule],
  controllers: [ConfluenceController],
  providers: [ConfluenceService],
  exports: [ConfluenceService],
})
export class ConfluenceModule {}
