import { Module } from '@nestjs/common';
import { MockServerController } from './mock-server.controller';
import { MockServerService } from './mock-server.service';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

@Module({
  controllers: [MockServerController],
  providers: [MockServerService, FirebaseAdminService],
  exports: [MockServerService],
})
export class MockServerModule {}
