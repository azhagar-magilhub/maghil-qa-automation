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
import { ProjectService } from './project.service';

@Controller('projects')
@UseGuards(FirebaseAuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  async createProject(
    @CurrentUser() user: FirebaseUser,
    @Body()
    body: {
      name: string;
      description?: string;
      jiraProjectKey?: string;
    },
  ) {
    return this.projectService.createProject(user.uid, body);
  }

  @Get()
  async listProjects(@CurrentUser() user: FirebaseUser) {
    return this.projectService.listProjects(user.uid);
  }

  @Get(':id')
  async getProject(
    @CurrentUser() user: FirebaseUser,
    @Param('id') id: string,
  ) {
    return this.projectService.getProject(user.uid, id);
  }

  @Put(':id')
  async updateProject(
    @CurrentUser() user: FirebaseUser,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      jiraProjectKey?: string;
    },
  ) {
    return this.projectService.updateProject(user.uid, id, body);
  }

  @Delete(':id')
  async deleteProject(
    @CurrentUser() user: FirebaseUser,
    @Param('id') id: string,
  ) {
    return this.projectService.deleteProject(user.uid, id);
  }
}
