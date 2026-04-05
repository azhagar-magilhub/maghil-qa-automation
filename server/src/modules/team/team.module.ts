import { Module } from '@nestjs/common';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

@Module({
  controllers: [TeamController],
  providers: [TeamService, FirebaseAdminService],
  exports: [TeamService],
})
export class TeamModule {}
