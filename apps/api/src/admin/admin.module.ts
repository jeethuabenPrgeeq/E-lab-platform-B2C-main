import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { JudgeModule } from '../judge/judge.module.js';
import { SubmissionsModule } from '../submissions/submissions.module.js';
import { AccessController } from './access/access.controller.js';
import { AnalyticsController } from './analytics/analytics.controller.js';
import { AnalyticsService } from './analytics/analytics.service.js';
import { SuperDashboardController } from './analytics/super-dashboard.controller.js';
import { SuperDashboardService } from './analytics/super-dashboard.service.js';
import { AuditEventsController } from './audit/events.controller.js';
import { AuditEventsService } from './audit/events.service.js';
import { BillingController } from './billing/billing.controller.js';
import { BillingService } from './billing/billing.service.js';
import { JudgeAdminController } from './platform/judge-admin.controller.js';
import { JudgeAdminService } from './platform/judge-admin.service.js';
import { ExecutionsMonitorService } from './platform/executions-monitor.service.js';
import { ExecutionsMonitorController, SubmissionsAdminController } from './platform/platform.controller.js';
import { RuntimesController } from './platform/runtimes.controller.js';
import { RuntimesService } from './platform/runtimes.service.js';
import { SubmissionsAdminService } from './platform/submissions-admin.service.js';
import { AccessService } from './access/access.service.js';
import { PermissionGuard } from './access/permission.guard.js';
import { AuditController } from './audit/audit.controller.js';
import { AuditService } from './audit/audit.service.js';
import { ProblemVersioningService } from './problems/problem-versioning.service.js';
import { ProblemsController } from './problems/problems.controller.js';
import { ProblemsService } from './problems/problems.service.js';
import { TechnologiesController } from './technologies/technologies.controller.js';
import { TechnologiesService } from './technologies/technologies.service.js';
import { TestCasesController } from './test-cases/test-cases.controller.js';
import { TestCasesService } from './test-cases/test-cases.service.js';
import { CatalogService } from './content/catalog.service.js';
import { ChallengesService } from './content/challenges.service.js';
import { ContentController } from './content/content.controller.js';
import { ContentDashboardController } from './content-manager/content-dashboard.controller.js';
import { ContentDashboardService } from './content-manager/content-dashboard.service.js';
import { ContentProblemsController } from './content-manager/content-problems.controller.js';
import { ContentProblemsService } from './content-manager/content-problems.service.js';
import { OwnershipController } from './content-manager/ownership.controller.js';
import { OwnershipService } from './content-manager/ownership.service.js';
import { PathsService } from './content/paths.service.js';
import { CouponsService } from './revenue/coupons.service.js';
import { PricesService } from './revenue/prices.service.js';
import { RevenueController } from './revenue/revenue.controller.js';
import { SubscriptionsService } from './revenue/subscriptions.service.js';
import { ReportsController } from './reports/reports.controller.js';
import { ReportsService } from './reports/reports.service.js';
import { EscalationController, HelpdeskController, SupportController } from './support/support.controller.js';
import { SupportService } from './support/support.service.js';
import { InboxController, NotificationsController } from './notifications/notifications.controller.js';
import { NotificationsService } from './notifications/notifications.service.js';
import { PublicSettingsController, SettingsController } from './settings/settings.controller.js';
import { SettingsService } from './settings/settings.service.js';
import { LearnersController } from './users/learners.controller.js';
import { LearnersService } from './users/learners.service.js';
import { UsersController } from './users/users.controller.js';
import { UsersService } from './users/users.service.js';
import { IncidentsService } from './ops/incidents.service.js';
import { OpsDirectory } from './ops/ops.common.js';
import {
  IncidentsController,
  LearnerOpsController,
  PlatformAuditController,
  PlatformOpsController,
  ProblemReportsController,
  PublicOpsController,
  ReleasesController,
  TechSupportController,
} from './ops/ops.controller.js';
import { PlatformAuditService } from './ops/platform-audit.service.js';
import { PlatformDashboardService } from './ops/platform-dashboard.service.js';
import { ProblemReportsService } from './ops/problem-reports.service.js';
import { ReleasesService } from './ops/releases.service.js';
import { TechSupportService } from './ops/tech-support.service.js';

@Module({
  imports: [AuthModule, JudgeModule, SubmissionsModule],
  controllers: [
    AuditController,
    TechnologiesController,
    ProblemsController,
    TestCasesController,
    UsersController,
    LearnersController,
    SuperDashboardController,
    ContentDashboardController,
    ContentProblemsController,
    OwnershipController,
    ContentController,
    RevenueController,
    SupportController,
    EscalationController,
    HelpdeskController,
    ReportsController,
    SettingsController,
    PublicSettingsController,
    NotificationsController,
    InboxController,
    AccessController,
    AnalyticsController,
    AuditEventsController,
    BillingController,
    JudgeAdminController,
    RuntimesController,
    ExecutionsMonitorController,
    SubmissionsAdminController,
    PlatformOpsController,
    ProblemReportsController,
    TechSupportController,
    IncidentsController,
    ReleasesController,
    PlatformAuditController,
    LearnerOpsController,
    PublicOpsController,
  ],
  providers: [
    AuditService,
    ProblemVersioningService,
    TechnologiesService,
    ProblemsService,
    TestCasesService,
    UsersService,
    LearnersService,
    SuperDashboardService,
    ContentDashboardService,
    ContentProblemsService,
    OwnershipService,
    CatalogService,
    PathsService,
    ChallengesService,
    PricesService,
    CouponsService,
    SubscriptionsService,
    SupportService,
    ReportsService,
    SettingsService,
    NotificationsService,
    AccessService,
    AnalyticsService,
    AuditEventsService,
    BillingService,
    JudgeAdminService,
    RuntimesService,
    ExecutionsMonitorService,
    SubmissionsAdminService,
    OpsDirectory,
    ProblemReportsService,
    TechSupportService,
    IncidentsService,
    ReleasesService,
    PlatformDashboardService,
    PlatformAuditService,
    PermissionGuard,
  ],
  exports: [AuditService],
})
export class AdminModule {}
