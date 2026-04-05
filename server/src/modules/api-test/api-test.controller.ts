import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser, FirebaseUser } from '../../common/decorators/current-user.decorator';
import { ApiTestService } from './api-test.service';

@Controller('api-test')
@UseGuards(FirebaseAuthGuard)
export class ApiTestController {
  constructor(private readonly apiTestService: ApiTestService) {}

  @Post('execute')
  async executeRequest(
    @CurrentUser() user: FirebaseUser,
    @Body() body: {
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
      url: string;
      headers?: Record<string, string>;
      body?: unknown;
      auth?: {
        type: 'basic' | 'bearer' | 'apikey';
        username?: string;
        password?: string;
        token?: string;
        key?: string;
        value?: string;
        addTo?: 'header' | 'query';
      };
      assertions?: Array<{
        type: 'status' | 'jsonpath' | 'header' | 'response_time';
        target?: string;
        expected: unknown;
        operator?: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'exists';
      }>;
    },
  ) {
    return this.apiTestService.executeRequest(user.uid, body);
  }

  @Post('run/:collectionId')
  async runCollection(
    @CurrentUser() user: FirebaseUser,
    @Param('collectionId') collectionId: string,
  ) {
    return this.apiTestService.runCollection(user.uid, collectionId);
  }

  @Post('import/postman')
  async importPostman(
    @CurrentUser() user: FirebaseUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.apiTestService.importPostman(user.uid, body);
  }

  @Post('import/openapi')
  async importOpenAPI(
    @CurrentUser() user: FirebaseUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.apiTestService.importOpenAPI(user.uid, body);
  }

  @Get('collections')
  async getCollections(@CurrentUser() user: FirebaseUser) {
    return this.apiTestService.getCollections(user.uid);
  }
}
