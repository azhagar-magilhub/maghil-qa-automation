import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser, FirebaseUser } from '../../common/decorators/current-user.decorator';
import { CicdService } from './cicd.service';

@Controller('cicd')
@UseGuards(FirebaseAuthGuard)
export class CicdController {
  constructor(private readonly cicdService: CicdService) {}

  @Post('trigger')
  async triggerTestRun(
    @CurrentUser() user: FirebaseUser,
    @Body()
    body: {
      collectionId: string;
      type: 'SMOKE' | 'REGRESSION' | 'FULL' | 'CUSTOM';
      environment: string;
      notifyOnComplete?: boolean;
    },
  ) {
    return this.cicdService.triggerTestRun(user.uid, body);
  }

  @Post('webhook')
  async receiveWebhook(@Body() payload: Record<string, unknown>) {
    // Webhook endpoint does not require auth — external CI/CD systems call this
    return this.cicdService.receiveWebhook(payload);
  }

  @Get('gate/:runId')
  async checkGate(
    @CurrentUser() user: FirebaseUser,
    @Param('runId') runId: string,
  ) {
    return this.cicdService.checkGate(user.uid, runId);
  }

  @Post('pr-comment')
  async postPRComment(
    @CurrentUser() user: FirebaseUser,
    @Body()
    body: {
      owner: string;
      repo: string;
      prNumber: number;
      runId: string;
      token?: string;
    },
  ) {
    return this.cicdService.postPRComment(user.uid, body);
  }
}
