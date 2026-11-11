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
import { IdParam, PageQuery } from '../../common/pagination.js';
import { AuthGuard, requireRole } from '../auth/auth.guard.js';
import { CreateCategory, UpdateCategory } from './categories.schemas.js';
import { CategoriesService } from './categories.service.js';

const list = { query: PageQuery } satisfies RouteSchema;
const byId = { params: IdParam } satisfies RouteSchema;
const create = { body: CreateCategory } satisfies RouteSchema;
const update = { params: IdParam, body: UpdateCategory } satisfies RouteSchema;
const editors = requireRole('admin', 'editor');

@Controller('/categories')
@UseGuards(AuthGuard)
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get('/', { schema: list })
  list(ctx: RouteContext<typeof list>) {
    return this.categories.list(ctx.input.query);
  }

  @Get('/:id', { schema: byId })
  async findOne(ctx: RouteContext<typeof byId>) {
    return { data: await this.categories.findOne(ctx.input.params.id) };
  }

  @Post('/', { schema: create })
  @UseGuards(editors)
  async create(ctx: RouteContext<typeof create>) {
    return reply({ data: await this.categories.create(ctx.input.body) }, { status: 201 });
  }

  @Patch('/:id', { schema: update })
  @UseGuards(editors)
  async update(ctx: RouteContext<typeof update>) {
    return { data: await this.categories.update(ctx.input.params.id, ctx.input.body) };
  }

  @Delete('/:id', { schema: byId })
  @UseGuards(editors)
  async remove(ctx: RouteContext<typeof byId>) {
    await this.categories.remove(ctx.input.params.id);
    return reply(undefined, { status: 204 });
  }
}
