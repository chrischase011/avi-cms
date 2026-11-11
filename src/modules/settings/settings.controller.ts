import { Controller, Get, Put, UseGuards, type RouteContext, type RouteSchema } from '@avijs/core';
import { AuthGuard, requireRole } from '../auth/auth.guard.js';
import { UpdateSettings } from './settings.schemas.js';
import { SettingsService } from './settings.service.js';

const update = { body: UpdateSettings } satisfies RouteSchema;

@Controller('/settings')
@UseGuards(AuthGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('/')
  async get() {
    return { data: await this.settings.get() };
  }

  @Put('/', { schema: update })
  @UseGuards(requireRole('admin'))
  async update(ctx: RouteContext<typeof update>) {
    return { data: await this.settings.update(ctx.input.body) };
  }
}
