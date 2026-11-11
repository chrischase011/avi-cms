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
import { CreatePost, PostQuery, UpdatePost } from './posts.schemas.js';
import { PostsService } from './posts.service.js';

const list = { query: PostQuery } satisfies RouteSchema;
const byId = { params: IdParam } satisfies RouteSchema;
const create = { body: CreatePost } satisfies RouteSchema;
const update = { params: IdParam, body: UpdatePost } satisfies RouteSchema;

@Controller('/posts')
@UseGuards(AuthGuard)
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get('/', { schema: list })
  list(ctx: RouteContext<typeof list>) {
    return this.posts.list(ctx.input.query, ctx.need('user'));
  }

  @Get('/:id', { schema: byId })
  async findOne(ctx: RouteContext<typeof byId>) {
    return { data: await this.posts.findOne(ctx.input.params.id, ctx.need('user')) };
  }

  @Post('/', { schema: create })
  async create(ctx: RouteContext<typeof create>) {
    return reply({ data: await this.posts.create(ctx.input.body, ctx.need('user')) }, { status: 201 });
  }

  @Patch('/:id', { schema: update })
  async update(ctx: RouteContext<typeof update>) {
    return { data: await this.posts.update(ctx.input.params.id, ctx.input.body, ctx.need('user')) };
  }

  @Post('/:id/publish', { schema: byId })
  @UseGuards(requireRole('admin', 'editor'))
  async publish(ctx: RouteContext<typeof byId>) {
    return { data: await this.posts.setStatus(ctx.input.params.id, 'published', ctx.need('user')) };
  }

  @Post('/:id/unpublish', { schema: byId })
  @UseGuards(requireRole('admin', 'editor'))
  async unpublish(ctx: RouteContext<typeof byId>) {
    return { data: await this.posts.setStatus(ctx.input.params.id, 'draft', ctx.need('user')) };
  }

  @Delete('/:id', { schema: byId })
  async remove(ctx: RouteContext<typeof byId>) {
    await this.posts.remove(ctx.input.params.id, ctx.need('user'));
    return reply(undefined, { status: 204 });
  }
}
