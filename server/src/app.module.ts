import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseAdminModule } from './config/firebase-admin.config';
import { IntegrationModule } from './modules/integration/integration.module';
import { JiraModule } from './modules/jira/jira.module';
import { ConfluenceModule } from './modules/confluence/confluence.module';
import { TeamsModule } from './modules/teams/teams.module';
import { ExcelModule } from './modules/excel/excel.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { ApiTestModule } from './modules/api-test/api-test.module';
import { BugFilingModule } from './modules/bug-filing/bug-filing.module';
import { WebTestModule } from './modules/web-test/web-test.module';
import { MobileTestModule } from './modules/mobile-test/mobile-test.module';
import { SecurityModule } from './modules/security/security.module';
import { PerformanceModule } from './modules/performance/performance.module';
import { TestDataModule } from './modules/test-data/test-data.module';
import { EnvironmentModule } from './modules/environment/environment.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CicdModule } from './modules/cicd/cicd.module';
import { AccessibilityModule } from './modules/accessibility/accessibility.module';
import { LogAnalyzerModule } from './modules/log-analyzer/log-analyzer.module';
import { AiModule } from './modules/ai/ai.module';
import { ContractModule } from './modules/contract/contract.module';
import { ChaosModule } from './modules/chaos/chaos.module';
import { DbTestModule } from './modules/db-test/db-test.module';
import { SnapshotModule } from './modules/snapshot/snapshot.module';
import { FlakeAnalyzerModule } from './modules/flake-analyzer/flake-analyzer.module';
import { CoverageModule } from './modules/coverage/coverage.module';
import { ReleaseGateModule } from './modules/release-gate/release-gate.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { TeamModule } from './modules/team/team.module';
import { ProjectModule } from './modules/project/project.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { MockServerModule } from './modules/mock-server/mock-server.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    FirebaseAdminModule,
    IntegrationModule,
    JiraModule,
    ConfluenceModule,
    TeamsModule,
    ExcelModule,
    TicketsModule,
    ApiTestModule,
    BugFilingModule,
    WebTestModule,
    MobileTestModule,
    SecurityModule,
    PerformanceModule,
    TestDataModule,
    EnvironmentModule,
    NotificationsModule,
    CicdModule,
    AccessibilityModule,
    LogAnalyzerModule,
    AiModule,
    ContractModule,
    ChaosModule,
    DbTestModule,
    SnapshotModule,
    FlakeAnalyzerModule,
    CoverageModule,
    ReleaseGateModule,
    SchedulerModule,
    TeamModule,
    ProjectModule,
    WebhooksModule,
    MockServerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
