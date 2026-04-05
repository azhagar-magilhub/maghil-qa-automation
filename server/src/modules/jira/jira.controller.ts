import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser, FirebaseUser } from '../../common/decorators/current-user.decorator';
import { JiraService } from './jira.service';

@Controller('jira')
@UseGuards(FirebaseAuthGuard)
export class JiraController {
  constructor(private readonly jiraService: JiraService) {}

  @Post('test')
  async testConnection(@CurrentUser() user: FirebaseUser) {
    return this.jiraService.testConnection(user.uid);
  }

  @Get('projects')
  async getProjects(@CurrentUser() user: FirebaseUser) {
    return this.jiraService.getProjects(user.uid);
  }

  @Get('issue-types/:projectKey')
  async getIssueTypes(
    @CurrentUser() user: FirebaseUser,
    @Param('projectKey') projectKey: string,
  ) {
    return this.jiraService.getIssueTypes(user.uid, projectKey);
  }

  @Get('priorities')
  async getPriorities(@CurrentUser() user: FirebaseUser) {
    return this.jiraService.getPriorities(user.uid);
  }

  @Get('users')
  async searchUsers(
    @CurrentUser() user: FirebaseUser,
    @Query('query') query: string,
  ) {
    return this.jiraService.searchUsers(user.uid, query || '');
  }
}
