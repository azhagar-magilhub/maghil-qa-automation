import { Module } from '@nestjs/common';
import { ContractController } from './contract.controller';
import { ContractService } from './contract.service';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

@Module({
  controllers: [ContractController],
  providers: [ContractService, FirebaseAdminService],
  exports: [ContractService],
})
export class ContractModule {}
