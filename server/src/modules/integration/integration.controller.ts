import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser, FirebaseUser } from '../../common/decorators/current-user.decorator';
import { IntegrationService } from './integration.service';
import { SaveIntegrationDto, IntegrationType } from './dto/save-integration.dto';

@Controller('integrations')
@UseGuards(FirebaseAuthGuard)
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Get()
  async getAll(@CurrentUser() user: FirebaseUser) {
    return this.integrationService.getAll(user.uid);
  }

  @Post(':type')
  async save(
    @CurrentUser() user: FirebaseUser,
    @Param('type') type: IntegrationType,
    @Body() dto: SaveIntegrationDto,
  ) {
    return this.integrationService.save(user.uid, type, dto.config);
  }

  @Put(':type')
  async update(
    @CurrentUser() user: FirebaseUser,
    @Param('type') type: IntegrationType,
    @Body() dto: SaveIntegrationDto,
  ) {
    return this.integrationService.save(user.uid, type, dto.config);
  }

  @Post(':type/test')
  async testConnection(
    @CurrentUser() user: FirebaseUser,
    @Param('type') type: IntegrationType,
  ) {
    // The actual test is delegated to the specific service (jira, confluence, teams)
    // For now, just verify the config exists and is decryptable
    try {
      const config = await this.integrationService.getDecryptedConfig(user.uid, type);
      await this.integrationService.updateTestStatus(user.uid, type, true);
      return { success: true, message: `${type} connection configured`, fields: Object.keys(config) };
    } catch (error) {
      await this.integrationService.updateTestStatus(user.uid, type, false);
      return { success: false, message: error.message };
    }
  }

  @Get('health')
  async healthCheck(@CurrentUser() user: FirebaseUser) {
    const integrations = await this.integrationService.getAll(user.uid);
    return integrations.map((i) => ({
      type: i.type,
      isActive: i.isActive,
      lastTestStatus: i.lastTestStatus,
      lastTestedAt: i.lastTestedAt,
    }));
  }
}
