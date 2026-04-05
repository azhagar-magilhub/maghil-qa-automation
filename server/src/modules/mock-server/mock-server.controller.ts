import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  All,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import {
  CurrentUser,
  FirebaseUser,
} from '../../common/decorators/current-user.decorator';
import { MockServerService } from './mock-server.service';
import { Response, Request } from 'express';

@Controller()
export class MockServerController {
  constructor(private readonly mockServerService: MockServerService) {}

  @Post('mocks')
  @UseGuards(FirebaseAuthGuard)
  async createMock(
    @CurrentUser() user: FirebaseUser,
    @Body()
    body: {
      method: string;
      path: string;
      statusCode: number;
      headers: Record<string, string>;
      responseBody: string;
      delay: number;
      enabled: boolean;
      conditionalResponses?: Array<{
        matchField: string;
        matchValue: string;
        responseBody: string;
        statusCode: number;
      }>;
    },
  ) {
    return this.mockServerService.createMock(user.uid, body);
  }

  @Get('mocks')
  @UseGuards(FirebaseAuthGuard)
  async listMocks(@CurrentUser() user: FirebaseUser) {
    return this.mockServerService.listMocks(user.uid);
  }

  @Put('mocks/:id')
  @UseGuards(FirebaseAuthGuard)
  async updateMock(
    @Param('id') id: string,
    @Body() body: Partial<{
      method: string;
      path: string;
      statusCode: number;
      headers: Record<string, string>;
      responseBody: string;
      delay: number;
      enabled: boolean;
    }>,
  ) {
    return this.mockServerService.updateMock(id, body);
  }

  @Delete('mocks/:id')
  @UseGuards(FirebaseAuthGuard)
  async deleteMock(@Param('id') id: string) {
    return this.mockServerService.deleteMock(id);
  }

  @All('mock-proxy/:mockId/*')
  async serveMock(
    @Param('mockId') mockId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const result = await this.mockServerService.serveMock(
        mockId,
        req.body || {},
      );

      // Set custom headers
      if (result.headers) {
        Object.entries(result.headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
      }

      // Parse body if JSON
      let responseBody: unknown;
      try {
        responseBody = JSON.parse(result.body);
      } catch {
        responseBody = result.body;
      }

      res.status(result.statusCode).json(responseBody);
    } catch (error) {
      res.status(404).json({ error: 'Mock not found or disabled' });
    }
  }
}
