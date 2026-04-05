import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import {
  CurrentUser,
  FirebaseUser,
} from '../../common/decorators/current-user.decorator';
import { ContractService } from './contract.service';

@Controller('contracts')
@UseGuards(FirebaseAuthGuard)
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Post()
  async defineContract(
    @CurrentUser() user: FirebaseUser,
    @Body()
    body: {
      consumer: string;
      provider: string;
      baseUrl: string;
      expectations: Array<{
        method: string;
        path: string;
        headers?: Record<string, string>;
        body?: unknown;
        expectedStatus: number;
        expectedHeaders?: Record<string, string>;
        expectedBodySchema?: Record<string, unknown>;
      }>;
    },
  ) {
    return this.contractService.defineContract(user.uid, body);
  }

  @Post(':id/verify')
  async verifyContract(
    @CurrentUser() user: FirebaseUser,
    @Param('id') contractId: string,
  ) {
    return this.contractService.verifyContract(user.uid, contractId);
  }

  @Get(':id/diff')
  async getDiff(
    @CurrentUser() user: FirebaseUser,
    @Param('id') contractId: string,
  ) {
    return this.contractService.getDiff(user.uid, contractId);
  }
}
