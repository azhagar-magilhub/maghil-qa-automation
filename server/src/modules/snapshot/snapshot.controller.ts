import { Controller, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import {
  CurrentUser,
  FirebaseUser,
} from '../../common/decorators/current-user.decorator';
import { SnapshotService } from './snapshot.service';

@Controller('snapshots')
@UseGuards(FirebaseAuthGuard)
export class SnapshotController {
  constructor(private readonly snapshotService: SnapshotService) {}

  @Post('capture')
  async capture(
    @CurrentUser() user: FirebaseUser,
    @Body()
    body: {
      name: string;
      type: 'api_response' | 'json_data';
      url?: string;
      data?: unknown;
    },
  ) {
    return this.snapshotService.capture(user.uid, body);
  }

  @Post(':id/compare')
  async compare(
    @CurrentUser() user: FirebaseUser,
    @Param('id') snapshotId: string,
  ) {
    return this.snapshotService.compare(user.uid, snapshotId);
  }

  @Put(':id/accept')
  async acceptBaseline(
    @CurrentUser() user: FirebaseUser,
    @Param('id') snapshotId: string,
  ) {
    return this.snapshotService.acceptBaseline(user.uid, snapshotId);
  }
}
