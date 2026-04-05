import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import {
  CurrentUser,
  FirebaseUser,
} from '../../common/decorators/current-user.decorator';
import { FlakeAnalyzerService } from './flake-analyzer.service';

@Controller('flakes')
@UseGuards(FirebaseAuthGuard)
export class FlakeAnalyzerController {
  constructor(
    private readonly flakeAnalyzerService: FlakeAnalyzerService,
  ) {}

  @Get()
  async getFlakes(@CurrentUser() user: FirebaseUser) {
    return this.flakeAnalyzerService.getFlakes(user.uid);
  }

  @Post(':testId/quarantine')
  async quarantine(
    @CurrentUser() user: FirebaseUser,
    @Param('testId') testId: string,
  ) {
    return this.flakeAnalyzerService.quarantine(user.uid, testId);
  }

  @Post(':testId/unquarantine')
  async unquarantine(
    @CurrentUser() user: FirebaseUser,
    @Param('testId') testId: string,
  ) {
    return this.flakeAnalyzerService.unquarantine(user.uid, testId);
  }

  @Post(':testId/record')
  async recordResult(
    @CurrentUser() user: FirebaseUser,
    @Param('testId') testId: string,
    @Body() body: { status: 'pass' | 'fail'; testName?: string },
  ) {
    return this.flakeAnalyzerService.recordResult(
      user.uid,
      testId,
      body.status,
      body.testName,
    );
  }
}
