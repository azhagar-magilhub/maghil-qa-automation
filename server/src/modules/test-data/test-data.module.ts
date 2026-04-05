import { Module } from '@nestjs/common';
import { TestDataController } from './test-data.controller';
import { TestDataService } from './test-data.service';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

@Module({
  controllers: [TestDataController],
  providers: [TestDataService, FirebaseAdminService],
  exports: [TestDataService],
})
export class TestDataModule {}
