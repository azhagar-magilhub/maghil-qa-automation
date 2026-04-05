import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser, FirebaseUser } from '../../common/decorators/current-user.decorator';
import { TeamsService } from './teams.service';

@Controller('teams')
@UseGuards(FirebaseAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get('joined')
  async getJoinedTeams(@CurrentUser() user: FirebaseUser) {
    return this.teamsService.getJoinedTeams(user.uid);
  }

  @Get(':teamId/channels')
  async getChannels(
    @CurrentUser() user: FirebaseUser,
    @Param('teamId') teamId: string,
  ) {
    return this.teamsService.getChannels(user.uid, teamId);
  }

  @Get(':teamId/channels/:channelId/messages')
  async getMessages(
    @CurrentUser() user: FirebaseUser,
    @Param('teamId') teamId: string,
    @Param('channelId') channelId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.teamsService.getMessages(user.uid, teamId, channelId, {
      from,
      to,
      keyword,
    });
  }

  @Post('create-tickets')
  async createTicketsFromMessages(
    @CurrentUser() user: FirebaseUser,
    @Body()
    body: {
      messages: { id: string; from: string; body: string; createdDateTime: string }[];
      projectKey: string;
      issueType: string;
    },
  ) {
    return this.teamsService.createTicketsFromMessages(
      user.uid,
      body.messages,
      body.projectKey,
      body.issueType,
    );
  }
}
