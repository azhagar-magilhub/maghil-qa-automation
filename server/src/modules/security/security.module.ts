import { Module } from '@nestjs/common';
import { SecurityController } from './security.controller';
import { SecurityService } from './security.service';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

@Module({
  controllers: [SecurityController],
  providers: [SecurityService, FirebaseAdminService],
  exports: [SecurityService],
})
export class SecurityModule {}
