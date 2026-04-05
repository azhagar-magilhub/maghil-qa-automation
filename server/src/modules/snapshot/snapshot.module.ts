import { Module } from '@nestjs/common';
import { SnapshotController } from './snapshot.controller';
import { SnapshotService } from './snapshot.service';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

@Module({
  controllers: [SnapshotController],
  providers: [SnapshotService, FirebaseAdminService],
  exports: [SnapshotService],
})
export class SnapshotModule {}
