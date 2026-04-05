import { Module } from '@nestjs/common';
import { WebTestController } from './web-test.controller';
import { WebTestService } from './web-test.service';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

@Module({
  controllers: [WebTestController],
  providers: [WebTestService, FirebaseAdminService],
  exports: [WebTestService],
})
export class WebTestModule {}
