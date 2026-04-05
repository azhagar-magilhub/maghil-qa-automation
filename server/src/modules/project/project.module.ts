import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

@Module({
  controllers: [ProjectController],
  providers: [ProjectService, FirebaseAdminService],
  exports: [ProjectService],
})
export class ProjectModule {}
