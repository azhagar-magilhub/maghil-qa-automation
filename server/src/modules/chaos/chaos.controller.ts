import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import {
  CurrentUser,
  FirebaseUser,
} from '../../common/decorators/current-user.decorator';
import { ChaosService } from './chaos.service';

@Controller('chaos')
@UseGuards(FirebaseAuthGuard)
export class ChaosController {
  constructor(private readonly chaosService: ChaosService) {}

  @Post('experiments')
  async createExperiment(
    @CurrentUser() user: FirebaseUser,
    @Body()
    body: {
      targetUrl: string;
      faultType: 'LATENCY' | 'HTTP_ERROR' | 'DEPENDENCY_FAILURE';
      duration: number;
      intensity: number;
      blastRadius: number;
    },
  ) {
    return this.chaosService.createExperiment(user.uid, body);
  }

  @Post('experiments/:id/run')
  async runExperiment(
    @CurrentUser() user: FirebaseUser,
    @Param('id') expId: string,
  ) {
    return this.chaosService.runExperiment(user.uid, expId);
  }

  @Post('experiments/:id/abort')
  async abortExperiment(
    @CurrentUser() user: FirebaseUser,
    @Param('id') expId: string,
  ) {
    return this.chaosService.abortExperiment(user.uid, expId);
  }

  @Get('experiments/:id/results')
  async getResults(
    @CurrentUser() user: FirebaseUser,
    @Param('id') expId: string,
  ) {
    return this.chaosService.getResults(user.uid, expId);
  }
}
