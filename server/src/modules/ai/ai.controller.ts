import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import {
  CurrentUser,
  FirebaseUser,
} from '../../common/decorators/current-user.decorator';
import { AiService } from './ai.service';

@Controller('ai')
@UseGuards(FirebaseAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate/test-cases')
  async generateTestCases(
    @CurrentUser() user: FirebaseUser,
    @Body()
    body: {
      source: 'jira_story' | 'api_spec';
      content: string;
      detailLevel: string;
    },
  ) {
    return this.aiService.generateTestCases(user.uid, body);
  }

  @Post('generate/playwright-script')
  async generatePlaywrightScript(
    @CurrentUser() user: FirebaseUser,
    @Body()
    body: {
      testCase?: string;
      url?: string;
      description?: string;
      language?: string;
    },
  ) {
    return this.aiService.generatePlaywrightScript(user.uid, body);
  }

  @Post('generate/appium-script')
  async generateAppiumScript(
    @CurrentUser() user: FirebaseUser,
    @Body() body: { testCase: string; platform: string; language?: string },
  ) {
    return this.aiService.generateAppiumScript(user.uid, body);
  }

  @Post('generate/api-script')
  async generateApiScript(
    @CurrentUser() user: FirebaseUser,
    @Body() body: { spec?: string; description?: string; language?: string },
  ) {
    return this.aiService.generateApiScript(user.uid, body);
  }

  @Post('generate/release-notes')
  async generateReleaseNotes(
    @CurrentUser() user: FirebaseUser,
    @Body()
    body: {
      tickets: Array<{
        key: string;
        summary: string;
        type: string;
        labels?: string[];
      }>;
      template?: string;
      format?: string;
    },
  ) {
    return this.aiService.generateReleaseNotes(user.uid, body);
  }

  @Post('generate/gherkin')
  async generateGherkin(
    @CurrentUser() user: FirebaseUser,
    @Body() body: { requirement: string },
  ) {
    return this.aiService.generateGherkin(user.uid, body);
  }
}
