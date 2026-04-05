import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser, FirebaseUser } from '../../common/decorators/current-user.decorator';
import { PerformanceService } from './performance.service';

@Controller('performance')
@UseGuards(FirebaseAuthGuard)
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Post('load')
  async runLoadTest(
    @CurrentUser() user: FirebaseUser,
    @Body()
    body: {
      targetUrl: string;
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      headers?: Record<string, string>;
      body?: unknown;
      vus: number;
      duration: number;
      rampUp: number;
      thresholds?: {
        maxResponseTime?: number;
        maxErrorRate?: number;
        p95ResponseTime?: number;
      };
    },
  ) {
    return this.performanceService.runLoadTest(user.uid, body);
  }

  @Post('lighthouse')
  async runLighthouse(
    @CurrentUser() user: FirebaseUser,
    @Body() body: { targetUrl: string },
  ) {
    return this.performanceService.runLighthouse(user.uid, body.targetUrl);
  }

  @Get('runs/:runId')
  async getRun(
    @CurrentUser() user: FirebaseUser,
    @Param('runId') runId: string,
  ) {
    return this.performanceService.getRun(user.uid, runId);
  }
}
