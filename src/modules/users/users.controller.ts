import {
  Controller,
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
import {
  CreateUserDto,
  SetPasswordDto,
  UpdateUserDto,
  UserListResponse,
  UserResponse,
  UsersQuery,
} from './dto/user.dto.js';
import { UsersService } from './users.service.js';

const list = { query: UsersQuery, response: UserListResponse } satisfies RouteSchema;
const findOne = { params: IdParam, response: UserResponse } satisfies RouteSchema;
const create = { body: CreateUserDto, response: UserResponse } satisfies RouteSchema;
const update = { params: IdParam, body: UpdateUserDto, response: UserResponse } satisfies RouteSchema;
const setPassword = { params: IdParam, body: SetPasswordDto } satisfies RouteSchema;

/** Accounts are deactivated rather than deleted, so their content keeps its author. */
@Controller('/users')
@UseGuards(AuthGuard, requireRole('admin'))
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('/', { schema: list })
  findAll(ctx: RouteContext<typeof list>) {
    return this.users.list(ctx.input.query);
  }

  @Get('/:id', { schema: findOne })
  async findOne(ctx: RouteContext<typeof findOne>) {
    return { data: await this.users.findOne(ctx.input.params.id) };
  }

  @Post('/', { schema: create })
  async create(ctx: RouteContext<typeof create>) {
    return reply({ data: await this.users.create(ctx.input.body) }, { status: 201 });
  }

  @Patch('/:id', { schema: update })
  async update(ctx: RouteContext<typeof update>) {
    return { data: await this.users.update(ctx.input.params.id, ctx.input.body, ctx.need('user')) };
  }

  @Post('/:id/password', { schema: setPassword })
  async setPassword(ctx: RouteContext<typeof setPassword>) {
    await this.users.setPassword(ctx.input.params.id, ctx.input.body.password);
    return reply(undefined, { status: 204 });
  }
}
