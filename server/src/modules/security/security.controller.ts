import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser, FirebaseUser } from '../../common/decorators/current-user.decorator';
import { SecurityService } from './security.service';

@Controller('security')
@UseGuards(FirebaseAuthGuard)
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Post('scan')
  async scan(
    @CurrentUser() user: FirebaseUser,
    @Body() body: { targetUrl: string; scanType: 'FULL' | 'HEADERS' | 'SSL' },
  ) {
    return this.securityService.scanOWASP(
      user.uid,
      body.targetUrl,
      body.scanType,
    );
  }

  @Post('headers')
  async scanHeaders(
    @CurrentUser() user: FirebaseUser,
    @Body() body: { targetUrl: string },
  ) {
    return this.securityService.scanHeaders(user.uid, body.targetUrl);
  }

  @Post('ssl')
  async checkSSL(
    @CurrentUser() user: FirebaseUser,
    @Body() body: { targetUrl: string },
  ) {
    return this.securityService.checkSSL(user.uid, body.targetUrl);
  }

  @Get('scans')
  async listScans(@CurrentUser() user: FirebaseUser) {
    return this.securityService.listScans(user.uid);
  }

  @Get('scans/:scanId')
  async getScan(
    @CurrentUser() user: FirebaseUser,
    @Param('scanId') scanId: string,
  ) {
    return this.securityService.getScan(user.uid, scanId);
  }
}
