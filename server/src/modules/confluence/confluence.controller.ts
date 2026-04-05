import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser, FirebaseUser } from '../../common/decorators/current-user.decorator';
import { ConfluenceService } from './confluence.service';

@Controller('confluence')
@UseGuards(FirebaseAuthGuard)
export class ConfluenceController {
  constructor(private readonly confluenceService: ConfluenceService) {}

  @Get('spaces')
  async getSpaces(@CurrentUser() user: FirebaseUser) {
    return this.confluenceService.getSpaces(user.uid);
  }

  @Get('pages')
  async getPages(
    @CurrentUser() user: FirebaseUser,
    @Query('spaceKey') spaceKey: string,
  ) {
    return this.confluenceService.getPages(user.uid, spaceKey);
  }

  @Post('publish')
  async publishReport(
    @CurrentUser() user: FirebaseUser,
    @Body()
    body: {
      spaceKey: string;
      title: string;
      dateRange?: { from: string; to: string };
      pageId?: string;
      tickets: { key: string; summary: string; status: string; assignee?: string }[];
    },
  ) {
    return this.confluenceService.publishReport(
      user.uid,
      body.spaceKey,
      body.title,
      body.tickets,
      body.pageId,
    );
  }
}
