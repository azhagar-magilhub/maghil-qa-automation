import { Module } from '@nestjs/common';
import { ApiTestController } from './api-test.controller';
import { ApiTestService } from './api-test.service';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

@Module({
  controllers: [ApiTestController],
  providers: [ApiTestService, FirebaseAdminService],
  exports: [ApiTestService],
})
export class ApiTestModule {}
