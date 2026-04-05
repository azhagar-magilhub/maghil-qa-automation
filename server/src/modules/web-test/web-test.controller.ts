import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser, FirebaseUser } from '../../common/decorators/current-user.decorator';
import { WebTestService } from './web-test.service';

@Controller('web-test')
@UseGuards(FirebaseAuthGuard)
export class WebTestController {
  constructor(private readonly webTestService: WebTestService) {}

  @Post('run')
  async runTest(
    @CurrentUser() user: FirebaseUser,
    @Body()
    body: {
      script: string;
      targetUrl: string;
      browser: 'chromium' | 'firefox' | 'webkit';
      viewport: { width: number; height: number };
    },
  ) {
    return this.webTestService.runTest(user.uid, body);
  }

  @Get('executions')
  async listExecutions(@CurrentUser() user: FirebaseUser) {
    return this.webTestService.listExecutions(user.uid);
  }

  @Get('executions/:id')
  async getExecution(
    @CurrentUser() user: FirebaseUser,
    @Param('id') id: string,
  ) {
    return this.webTestService.getExecution(user.uid, id);
  }

  @Post('visual-diff')
  async compareVisual(
    @CurrentUser() user: FirebaseUser,
    @Body() body: { baselineId: string; currentId: string },
  ) {
    return this.webTestService.compareVisual(
      user.uid,
      body.baselineId,
      body.currentId,
    );
  }
}
