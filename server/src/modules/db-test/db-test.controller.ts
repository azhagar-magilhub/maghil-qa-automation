import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import {
  CurrentUser,
  FirebaseUser,
} from '../../common/decorators/current-user.decorator';
import { DbTestService } from './db-test.service';

@Controller('db-test')
@UseGuards(FirebaseAuthGuard)
export class DbTestController {
  constructor(private readonly dbTestService: DbTestService) {}

  @Post('connect')
  async connect(
    @CurrentUser() user: FirebaseUser,
    @Body()
    body: {
      name: string;
      type: 'mysql' | 'postgresql' | 'mongodb' | 'sqlite';
      host: string;
      port: number;
      database: string;
      username: string;
      password: string;
    },
  ) {
    return this.dbTestService.connect(user.uid, body);
  }

  @Post('execute')
  async execute(
    @CurrentUser() user: FirebaseUser,
    @Body() body: { connectionId: string; query: string },
  ) {
    return this.dbTestService.execute(user.uid, body.connectionId, body.query);
  }

  @Post('integrity')
  async checkIntegrity(
    @CurrentUser() user: FirebaseUser,
    @Body() body: { connectionId: string },
  ) {
    return this.dbTestService.checkIntegrity(user.uid, body.connectionId);
  }

  @Post('schema-diff')
  async schemaDiff(
    @CurrentUser() user: FirebaseUser,
    @Body() body: { connectionId1: string; connectionId2: string },
  ) {
    return this.dbTestService.schemaDiff(
      user.uid,
      body.connectionId1,
      body.connectionId2,
    );
  }
}
