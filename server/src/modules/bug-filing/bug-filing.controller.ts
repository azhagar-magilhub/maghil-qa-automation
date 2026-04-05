import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser, FirebaseUser } from '../../common/decorators/current-user.decorator';
import { BugFilingService, FailureData } from './bug-filing.service';

@Controller('bugs')
@UseGuards(FirebaseAuthGuard)
export class BugFilingController {
  constructor(private readonly bugFilingService: BugFilingService) {}

  @Post('auto-file')
  async autoFileBug(
    @CurrentUser() user: FirebaseUser,
    @Body() failureData: FailureData,
  ) {
    return this.bugFilingService.fileBugIfNew(user.uid, failureData);
  }

  @Get('duplicates')
  async checkDuplicates(
    @CurrentUser() user: FirebaseUser,
    @Query('summary') summary: string,
    @Query('projectKey') projectKey?: string,
  ) {
    return this.bugFilingService.checkDuplicate(user.uid, summary, projectKey);
  }
}
