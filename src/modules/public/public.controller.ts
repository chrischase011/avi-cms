import { Controller, Get, type RouteContext, type RouteSchema } from '@avijs/core';
import {
  PublicPageResponse,
  PublicPostList,
  PublicPostResponse,
  PublicPostsQuery,
  PublicSettingsResponse,
  PublicTermList,
  SlugParam,
} from './public.schemas.js';
import { PublicService } from './public.service.js';

const list = { query: PublicPostsQuery, response: PublicPostList } satisfies RouteSchema;
const post = { params: SlugParam, response: PublicPostResponse } satisfies RouteSchema;
const page = { params: SlugParam, response: PublicPageResponse } satisfies RouteSchema;

/** No guards: anyone may read published content. Every route has a response schema. */
@Controller('/public')
export class PublicController {
  // `public` is a reserved word, so the generated parameter name is replaced.
  constructor(private readonly content: PublicService) {}

  @Get('/posts', { schema: list })
  posts(ctx: RouteContext<typeof list>) {
    return this.content.posts(ctx.input.query);
  }

  @Get('/posts/:slug', { schema: post })
  post(ctx: RouteContext<typeof post>) {
    return this.content.post(ctx.input.params.slug);
  }

  @Get('/pages/:slug', { schema: page })
  page(ctx: RouteContext<typeof page>) {
    return this.content.page(ctx.input.params.slug);
  }

  @Get('/categories', { schema: { response: PublicTermList } })
  categories() {
    return this.content.categories();
  }

  @Get('/tags', { schema: { response: PublicTermList } })
  tags() {
    return this.content.tags();
  }

  @Get('/settings', { schema: { response: PublicSettingsResponse } })
  settings() {
    return this.content.siteSettings();
  }
}
