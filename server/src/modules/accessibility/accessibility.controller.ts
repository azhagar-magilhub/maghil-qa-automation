import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser, FirebaseUser } from '../../common/decorators/current-user.decorator';
import { AccessibilityService } from './accessibility.service';

@Controller('accessibility')
@UseGuards(FirebaseAuthGuard)
export class AccessibilityController {
  constructor(private readonly accessibilityService: AccessibilityService) {}

  @Post('scan')
  async scan(
    @CurrentUser() user: FirebaseUser,
    @Body() body: { targetUrl: string },
  ) {
    return this.accessibilityService.scan(user.uid, body.targetUrl);
  }

  @Post('contrast')
  async checkContrast(
    @CurrentUser() user: FirebaseUser,
    @Body() body: { foreground: string; background: string },
  ) {
    return this.accessibilityService.checkContrast(body.foreground, body.background);
  }
}
