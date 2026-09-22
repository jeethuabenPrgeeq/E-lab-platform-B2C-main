import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import {
  SubmissionsService,
} from './submissions.service.js';

/* =========================================================
   SUBMISSION REQUEST TYPE

   Automatically derives the request
   type from SubmissionsService.submit().

   Therefore SubmissionRequest does NOT
   need to be exported from the service.
========================================================= */

type SubmissionRequest =
  Parameters<
    SubmissionsService['submit']
  >[0];

/* =========================================================
   SUBMISSIONS CONTROLLER
========================================================= */

@Controller('submissions')
export class SubmissionsController {
  constructor(
    private readonly submissionsService:
      SubmissionsService,
  ) {}

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
  ) {
    return this.submissionsService.submit(
      body,
    );
  }
}