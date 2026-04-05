import { Controller, Get, Post, Put, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser, FirebaseUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(FirebaseAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  async send(
    @CurrentUser() user: FirebaseUser,
    @Body()
    body: {
      title: string;
      message: string;
      type?: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
      channel?: 'IN_APP' | 'SLACK' | 'TEAMS' | 'EMAIL';
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.notificationsService.send(user.uid, body as any);
  }

  @Get('preferences')
  async getPreferences(@CurrentUser() user: FirebaseUser) {
    return this.notificationsService.getPreferences(user.uid);
  }

  @Put('preferences')
  async updatePreferences(
    @CurrentUser() user: FirebaseUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.notificationsService.updatePreferences(user.uid, body);
  }
}
