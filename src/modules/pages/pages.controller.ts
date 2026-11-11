import {
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UseGuards,
  reply,
  type RouteContext,
  type RouteSchema,
} from '@avijs/core';
import { IdParam } from '../../common/pagination.js';
import { AuthGuard, requireRole } from '../auth/auth.guard.js';
import { CreatePage, PagesQuery, UpdatePage } from './pages.schemas.js';
import { PagesService } from './pages.service.js';

const list = { query: PagesQuery } satisfies RouteSchema;
const byId = { params: IdParam } satisfies RouteSchema;
const create = { body: CreatePage } satisfies RouteSchema;
const update = { params: IdParam, body: UpdatePage } satisfies RouteSchema;

/** Static pages are site-wide content: editors and administrators only. */
@Controller('/pages')
@UseGuards(AuthGuard, requireRole('admin', 'editor'))
export class PagesController {
  constructor(private readonly pages: PagesService) {}

  @Get('/', { schema: list })
  list(ctx: RouteContext<typeof list>) {
    return this.pages.list(ctx.input.query);
  }

  @Get('/:id', { schema: byId })
  async findOne(ctx: RouteContext<typeof byId>) {
    return { data: await this.pages.findOne(ctx.input.params.id) };
  }

  @Post('/', { schema: create })
  async create(ctx: RouteContext<typeof create>) {
    return reply({ data: await this.pages.create(ctx.input.body, ctx.need('user')) }, { status: 201 });
  }

  @Patch('/:id', { schema: update })
  async update(ctx: RouteContext<typeof update>) {
    return { data: await this.pages.update(ctx.input.params.id, ctx.input.body) };
  }

  @Post('/:id/publish', { schema: byId })
  async publish(ctx: RouteContext<typeof byId>) {
    return { data: await this.pages.update(ctx.input.params.id, { status: 'published' }) };
  }

  @Post('/:id/unpublish', { schema: byId })
  async unpublish(ctx: RouteContext<typeof byId>) {
    return { data: await this.pages.update(ctx.input.params.id, { status: 'draft' }) };
  }

  @Delete('/:id', { schema: byId })
  async remove(ctx: RouteContext<typeof byId>) {
    await this.pages.remove(ctx.input.params.id);
    return reply(undefined, { status: 204 });
  }
}
