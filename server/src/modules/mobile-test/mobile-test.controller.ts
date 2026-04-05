import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser, FirebaseUser } from '../../common/decorators/current-user.decorator';
import { MobileTestService } from './mobile-test.service';

@Controller('mobile-test')
@UseGuards(FirebaseAuthGuard)
export class MobileTestController {
  constructor(private readonly mobileTestService: MobileTestService) {}

  @Get('devices')
  async getDevices(@CurrentUser() user: FirebaseUser) {
    return this.mobileTestService.getDevices(user.uid);
  }

  @Post('run')
  async runTest(
    @CurrentUser() user: FirebaseUser,
    @Body()
    body: {
      script: string;
      appUrl: string;
      platform: 'android' | 'ios';
      deviceName: string;
      capabilities: Record<string, unknown>;
    },
  ) {
    return this.mobileTestService.runTest(user.uid, body);
  }

  @Get('executions/:id')
  async getExecution(
    @CurrentUser() user: FirebaseUser,
    @Param('id') id: string,
  ) {
    return this.mobileTestService.getExecution(user.uid, id);
  }

  @Post('capabilities/validate')
  async validateCapabilities(
    @CurrentUser() user: FirebaseUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.mobileTestService.validateCapabilities(body);
  }
}
