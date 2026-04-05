import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import {
  CurrentUser,
  FirebaseUser,
} from '../../common/decorators/current-user.decorator';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @UseGuards(FirebaseAuthGuard)
  async create(
    @CurrentUser() user: FirebaseUser,
    @Body()
    body: {
      name: string;
      direction: 'incoming' | 'outgoing';
      url: string;
      events: string[];
    },
  ) {
    return this.webhooksService.create(user.uid, body);
  }

  @Get()
  @UseGuards(FirebaseAuthGuard)
  async list(@CurrentUser() user: FirebaseUser) {
    return this.webhooksService.list(user.uid);
  }

  @Post(':id/test')
  @UseGuards(FirebaseAuthGuard)
  async test(
    @CurrentUser() user: FirebaseUser,
    @Param('id') webhookId: string,
  ) {
    return this.webhooksService.test(user.uid, webhookId);
  }

  @Post('incoming/:id')
  async receive(
    @Param('id') webhookId: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.webhooksService.receive(webhookId, payload);
  }

  @Put(':id')
  @UseGuards(FirebaseAuthGuard)
  async update(
    @CurrentUser() user: FirebaseUser,
    @Param('id') webhookId: string,
    @Body()
    body: Partial<{
      name: string;
      url: string;
      events: string[];
      enabled: boolean;
    }>,
  ) {
    return this.webhooksService.update(user.uid, webhookId, body);
  }

  @Delete(':id')
  @UseGuards(FirebaseAuthGuard)
  async delete(
    @CurrentUser() user: FirebaseUser,
    @Param('id') webhookId: string,
  ) {
    return this.webhooksService.delete(user.uid, webhookId);
  }
}
