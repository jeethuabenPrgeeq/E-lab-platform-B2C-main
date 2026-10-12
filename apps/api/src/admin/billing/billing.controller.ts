import { Controller, Get, Header, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { RequirePermission } from '../access/permission.decorator.js';
import { PermissionGuard } from '../access/permission.guard.js';
import { BillingService } from './billing.service.js';

@Controller('super/billing')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
@Roles('super-admin')
@RequirePermission('billing.view')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('summary')
  summary() {
    return this.billing.summary();
  }

  @Get('invoices/:paymentId')
  invoice(@Param('paymentId') paymentId: string) {
    return this.billing.invoice(paymentId);
  }

  @Get('invoices/:paymentId/download')
  @Header('Cache-Control', 'no-store')
  async download(@Param('paymentId') paymentId: string, @Res() res: Response) {
    const file = await this.billing.invoiceText(paymentId);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.text);
  }
}