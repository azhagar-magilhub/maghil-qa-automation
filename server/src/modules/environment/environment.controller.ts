import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser, FirebaseUser } from '../../common/decorators/current-user.decorator';
import { EnvironmentService } from './environment.service';

@Controller('environments')
@UseGuards(FirebaseAuthGuard)
export class EnvironmentController {
  constructor(private readonly environmentService: EnvironmentService) {}

  @Post()
  async register(
    @CurrentUser() user: FirebaseUser,
    @Body()
    body: {
      name: string;
      baseUrl: string;
      type: 'DEV' | 'STAGING' | 'QA' | 'PRODUCTION' | 'CUSTOM';
      variables?: Record<string, string>;
      headers?: Record<string, string>;
      description?: string;
    },
  ) {
    return this.environmentService.register(user.uid, body);
  }

  @Get()
  async listEnvironments(@CurrentUser() user: FirebaseUser) {
    return this.environmentService.listEnvironments(user.uid);
  }

  @Post(':id/health')
  async checkHealth(
    @CurrentUser() user: FirebaseUser,
    @Param('id') envId: string,
  ) {
    return this.environmentService.checkHealth(user.uid, envId);
  }

  @Post('diff')
  async diffConfigs(
    @CurrentUser() user: FirebaseUser,
    @Body() body: { envId1: string; envId2: string },
  ) {
    return this.environmentService.diffConfigs(user.uid, body.envId1, body.envId2);
  }
}
