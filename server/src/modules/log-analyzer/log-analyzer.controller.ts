import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser, FirebaseUser } from '../../common/decorators/current-user.decorator';
import { LogAnalyzerService } from './log-analyzer.service';

@Controller('logs')
@UseGuards(FirebaseAuthGuard)
export class LogAnalyzerController {
  constructor(private readonly logAnalyzerService: LogAnalyzerService) {}

  @Post('connect')
  async connect(
    @CurrentUser() user: FirebaseUser,
    @Body()
    body: {
      name: string;
      type: 'CLOUD_LOGGING' | 'ELK' | 'FILE';
      connectionUrl?: string;
      projectId?: string;
      indexPattern?: string;
      filePath?: string;
      credentials?: Record<string, unknown>;
    },
  ) {
    return this.logAnalyzerService.connect(user.uid, body);
  }

  @Post('search')
  async search(
    @CurrentUser() user: FirebaseUser,
    @Body()
    body: {
      sourceId: string;
      pattern?: string;
      severity?: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
      from?: string;
      to?: string;
      limit?: number;
    },
  ) {
    return this.logAnalyzerService.search(user.uid, body);
  }

  @Get('errors/grouped')
  async getErrorGroups(
    @CurrentUser() user: FirebaseUser,
    @Query('sourceId') sourceId: string,
  ) {
    return this.logAnalyzerService.getErrorGroups(user.uid, sourceId);
  }
}
