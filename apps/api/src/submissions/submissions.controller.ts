import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';
import { SubmissionsService } from './submissions.service.js';

/* =========================================================
   SUBMISSION REQUEST TYPE

   Automatically derives the request
   type from SubmissionsService.submit().

   Therefore SubmissionRequest does NOT
   need to be exported from the service.
========================================================= */

type SubmissionRequest = Parameters<SubmissionsService['submit']>[0];

/* =========================================================
   SUBMISSIONS CONTROLLER
========================================================= */

@Controller('submissions')
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  /* =======================================================
     SUBMIT CODE

     POST /api/v1/submissions

     Supports:
     - C
     - C++
     - Java
     - C#
     - Python
     - GO
     - Ruby
     - Swift
     - Git
  ======================================================= */

  @Post()
  submit(
    @Body()
    body: SubmissionRequest,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.submissionsService.submit(body, user?.id ?? null);
  }

  @Get('git-setup/:problemSlug')
  getGitSetupScript(@Param('problemSlug') problemSlug: string) {
    return this.submissionsService.getGitSetupScript(problemSlug);
  }

  @Post('git-check/:problemSlug')
  checkGitSession(
    @Param('problemSlug') problemSlug: string,
    @Body('containerName') containerName: string,
  ) {
    return this.submissionsService.checkGitSession(problemSlug, containerName);
  }

  @Get('linux-setup/:problemSlug')
  getLinuxSetupScript(@Param('problemSlug') problemSlug: string) {
    return this.submissionsService.getLinuxSetupScript(problemSlug);
  }

  @Post('linux-check/:problemSlug')
  checkLinuxSession(
    @Param('problemSlug') problemSlug: string,
    @Body('containerName') containerName: string,
  ) {
    return this.submissionsService.checkLinuxSession(
      problemSlug,
      containerName,
    );
  }

  @Get('docker-setup/:problemSlug')
  getDockerSetupScript(@Param('problemSlug') problemSlug: string) {
    return this.submissionsService.getDockerSetupScript(problemSlug);
  }

  @Post('docker-check/:problemSlug')
  checkDockerSession(
    @Param('problemSlug') problemSlug: string,
    @Body('containerName') containerName: string,
  ) {
    return this.submissionsService.checkDockerSession(
      problemSlug,
      containerName,
    );
  }

    @Get('kubernetes-setup/:problemSlug')
  getKubernetesSetupScript(@Param('problemSlug') problemSlug: string) {
    return this.submissionsService.getKubernetesSetupScript(problemSlug);
  }

  @Post('kubernetes-check/:problemSlug')
  checkKubernetesSession(
    @Param('problemSlug') problemSlug: string,
    @Body('containerName') containerName: string,
  ) {
    return this.submissionsService.checkKubernetesSession(
      problemSlug,
      containerName,
    );
  }

  @Get('cicd-setup/:problemSlug')
  getCicdSetupScript(@Param('problemSlug') problemSlug: string) {
    return this.submissionsService.getCicdSetupScript(problemSlug);
  }

  @Post('cicd-check/:problemSlug')
  checkCicdSession(
    @Param('problemSlug') problemSlug: string,
    @Body('containerName') containerName: string,
  ) {
    return this.submissionsService.checkCicdSession(
      problemSlug,
      containerName,
    );
  }
}
