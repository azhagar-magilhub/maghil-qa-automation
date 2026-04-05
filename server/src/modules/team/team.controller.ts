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
import { TeamService } from './team.service';

@Controller('team')
@UseGuards(FirebaseAuthGuard)
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post()
  async createTeam(
    @CurrentUser() user: FirebaseUser,
    @Body()
    body: {
      name: string;
      description?: string;
      defaultJiraProject?: string;
      notifyOnFail?: boolean;
      notifyOnPass?: boolean;
    },
  ) {
    return this.teamService.createTeam(user.uid, body);
  }

  @Get('members')
  async listMembers(@CurrentUser() user: FirebaseUser) {
    return this.teamService.listMembers(user.uid);
  }

  @Post('invite')
  async inviteMember(
    @CurrentUser() user: FirebaseUser,
    @Body() body: { email: string; role: string; teamId?: string },
  ) {
    return this.teamService.inviteMember(
      user.uid,
      body.teamId,
      body.email,
      body.role,
    );
  }

  @Put('members/:id/role')
  async updateMemberRole(
    @CurrentUser() user: FirebaseUser,
    @Param('id') memberId: string,
    @Body() body: { role: string; teamId?: string },
  ) {
    return this.teamService.updateMemberRole(
      user.uid,
      body.teamId,
      memberId,
      body.role,
    );
  }

  @Delete('members/:id')
  async removeMember(
    @CurrentUser() user: FirebaseUser,
    @Param('id') memberId: string,
  ) {
    return this.teamService.removeMember(user.uid, undefined, memberId);
  }
}
