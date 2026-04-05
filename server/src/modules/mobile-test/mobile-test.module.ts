import { Module } from '@nestjs/common';
import { MobileTestController } from './mobile-test.controller';
import { MobileTestService } from './mobile-test.service';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

@Module({
  controllers: [MobileTestController],
  providers: [MobileTestService, FirebaseAdminService],
  exports: [MobileTestService],
})
export class MobileTestModule {}
