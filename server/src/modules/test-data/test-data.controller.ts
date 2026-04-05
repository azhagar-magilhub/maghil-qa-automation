import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser, FirebaseUser } from '../../common/decorators/current-user.decorator';
import { TestDataService } from './test-data.service';

@Controller('test-data')
@UseGuards(FirebaseAuthGuard)
export class TestDataController {
  constructor(private readonly testDataService: TestDataService) {}

  @Post('generate')
  async generate(
    @CurrentUser() user: FirebaseUser,
    @Body()
    body: {
      fields: {
        name: string;
        type: string;
        options?: Record<string, unknown>;
      }[];
      count: number;
    },
  ) {
    return this.testDataService.generate({
      fields: body.fields as any,
      count: body.count,
    });
  }

  @Post('seed')
  async seed(
    @CurrentUser() user: FirebaseUser,
    @Body()
    body: {
      targetUrl: string;
      method: 'POST' | 'PUT' | 'PATCH';
      headers?: Record<string, string>;
      data: Record<string, unknown>[];
    },
  ) {
    return this.testDataService.seed(body);
  }

  @Get('presets')
  getPresets(@CurrentUser() user: FirebaseUser) {
    return this.testDataService.getPresets();
  }
}
