import {
  Controller,
  Delete,
  Get,
  HttpError,
  Patch,
  Post,
  UseGuards,
  reply,
  type Context,
  type RouteContext,
  type RouteSchema,
} from '@avijs/core';
import { readForm } from '@avijs/multipart';
import { z } from 'zod';
import { IdParam, PageQuery } from '../../common/pagination.js';
import { Config } from '../../config.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { ACCEPTED_TYPES } from './file-type.js';
import { MediaService } from './media.service.js';

const list = { query: PageQuery } satisfies RouteSchema;
const byId = { params: IdParam } satisfies RouteSchema;
const update = {
  params: IdParam,
  body: z.object({ alt: z.string().trim().max(255) }),
} satisfies RouteSchema;

@Controller('/media')
@UseGuards(AuthGuard)
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly config: Config,
  ) {}

  @Get('/', { schema: list })
  list(ctx: RouteContext<typeof list>) {
    return this.media.list(ctx.input.query);
  }

  @Get('/limits')
  limits() {
    return { data: { maxSize: this.config.UPLOAD_MAX_SIZE, accept: ACCEPTED_TYPES } };
  }

  @Get('/:id', { schema: byId })
  async findOne(ctx: RouteContext<typeof byId>) {
    return { data: await this.media.findOne(ctx.input.params.id) };
  }

  /** multipart/form-data: `file` (one image) and an optional `alt`. */
  @Post('/')
  async upload(ctx: Context) {
    const { fields, files } = await readForm(ctx, {
      files: 1,
      fields: 4,
      fileSize: this.config.UPLOAD_MAX_SIZE,
      maxTotalSize: this.config.UPLOAD_MAX_SIZE + 64 * 1024,
      accept: ACCEPTED_TYPES,
    });
    const file = files.find((candidate) => candidate.name === 'file');
    if (!file) throw new HttpError(400, 'Attach an image in the "file" field');
    const alt = fields['alt'];
    const media = await this.media.upload(
      {
        filename: file.filename,
        buffer: file.buffer,
        alt: (typeof alt === 'string' ? alt : '').trim().slice(0, 255),
      },
      ctx.need('user'),
    );
    return reply({ data: media }, { status: 201 });
  }

  @Patch('/:id', { schema: update })
  async update(ctx: RouteContext<typeof update>) {
    return { data: await this.media.updateAlt(ctx.input.params.id, ctx.input.body.alt, ctx.need('user')) };
  }

  @Delete('/:id', { schema: byId })
  async remove(ctx: RouteContext<typeof byId>) {
    await this.media.remove(ctx.input.params.id, ctx.need('user'));
    return reply(undefined, { status: 204 });
  }
}
