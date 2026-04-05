import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import {
  CurrentUser,
  FirebaseUser,
} from '../../common/decorators/current-user.decorator';
import { ReleaseGateService } from './release-gate.service';

@Controller('release-gate')
@UseGuards(FirebaseAuthGuard)
export class ReleaseGateController {
  constructor(private readonly releaseGateService: ReleaseGateService) {}

  @Post('evaluate')
  async evaluate(
    @CurrentUser() user: FirebaseUser,
    @Body()
    body: {
      criteria: {
        minTestPass: number;
        minCoverage: number;
        maxCriticalVulns: number;
      };
    },
  ) {
    return this.releaseGateService.evaluate(user.uid, body);
  }

  @Post(':id/approve')
  async approve(
    @CurrentUser() user: FirebaseUser,
    @Param('id') gateId: string,
  ) {
    return this.releaseGateService.approve(user.uid, gateId);
  }

  @Get(':id/scorecard')
  async getScorecard(
    @CurrentUser() user: FirebaseUser,
    @Param('id') gateId: string,
  ) {
    return this.releaseGateService.getScorecard(user.uid, gateId);
  }
}
