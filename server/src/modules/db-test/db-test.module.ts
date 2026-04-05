import { Module } from '@nestjs/common';
import { DbTestController } from './db-test.controller';
import { DbTestService } from './db-test.service';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

@Module({
  controllers: [DbTestController],
  providers: [DbTestService, FirebaseAdminService],
  exports: [DbTestService],
})
export class DbTestModule {}
