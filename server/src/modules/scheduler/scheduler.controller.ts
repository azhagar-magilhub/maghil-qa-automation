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
import { SchedulerService } from './scheduler.service';

@Controller('scheduler')
@UseGuards(FirebaseAuthGuard)
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Post()
  async createSchedule(
    @CurrentUser() user: FirebaseUser,
    @Body()
    body: {
      name: string;
      testType: 'api' | 'web' | 'security' | 'accessibility';
      testId: string;
      cronExpression: string;
      frequency: string;
      environment: string;
      enabled: boolean;
    },
  ) {
    return this.schedulerService.createSchedule(user.uid, body);
  }

  @Get()
  async listSchedules(@CurrentUser() user: FirebaseUser) {
    return this.schedulerService.listSchedules(user.uid);
  }

  @Post(':id/trigger')
  async triggerNow(
    @CurrentUser() user: FirebaseUser,
    @Param('id') id: string,
  ) {
    return this.schedulerService.triggerNow(user.uid, id);
  }

  @Put(':id')
  async updateSchedule(
    @CurrentUser() user: FirebaseUser,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.schedulerService.updateSchedule(user.uid, id, body as any);
  }

  @Delete(':id')
  async deleteSchedule(
    @CurrentUser() user: FirebaseUser,
    @Param('id') id: string,
  ) {
    return this.schedulerService.deleteSchedule(user.uid, id);
  }
}
