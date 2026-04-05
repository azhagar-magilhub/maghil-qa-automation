import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser, FirebaseUser } from '../../common/decorators/current-user.decorator';
import { ExcelService, FieldMapping } from './excel.service';

@Controller('excel')
@UseGuards(FirebaseAuthGuard)
export class ExcelController {
  constructor(private readonly excelService: ExcelService) {}

  @Post('parse')
  async parseExcel(
    @CurrentUser() user: FirebaseUser,
    @Body() body: { fileUrl: string },
  ) {
    return this.excelService.parseExcel(body.fileUrl);
  }

  @Post('validate')
  async validateMappedData(
    @CurrentUser() user: FirebaseUser,
    @Body() body: { rows: Record<string, string>[]; mappings: FieldMapping[] },
  ) {
    return this.excelService.validateMappedData(body.rows, body.mappings, user.uid);
  }

  @Post('create-tickets')
  async createTickets(
    @CurrentUser() user: FirebaseUser,
    @Body()
    body: {
      rows: Record<string, string>[];
      mappings: FieldMapping[];
      projectKey: string;
      issueType: string;
    },
  ) {
    return this.excelService.createTicketsFromExcel(
      user.uid,
      body.rows,
      body.mappings,
      body.projectKey,
      body.issueType,
    );
  }
}
