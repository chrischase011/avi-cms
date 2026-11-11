import { Controller, Get, UseGuards } from '@avijs/core';
import { AuthGuard } from '../auth/auth.guard.js';
import { DashboardService } from './dashboard.service.js';

@Controller('/dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('/')
  async overview() {
    return { data: await this.dashboard.overview() };
  }
}
