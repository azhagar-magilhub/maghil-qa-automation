import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser, FirebaseUser } from '../../common/decorators/current-user.decorator';
import { TicketsService } from './tickets.service';

@Controller('tickets')
@UseGuards(FirebaseAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('retry/:batchId')
  async retryFailed(
    @CurrentUser() user: FirebaseUser,
    @Param('batchId') batchId: string,
  ) {
    return this.ticketsService.retryFailed(user.uid, batchId);
  }
}
