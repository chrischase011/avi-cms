import {
  Controller,
  Get,
  Post,
  UseGuards,
  reply,
  type Context,
  type RouteContext,
  type RouteSchema,
} from '@avijs/core';
import { CSRF_COOKIE, readCookies } from '../../common/cookies.js';
import { AuthGuard } from './auth.guard.js';
import { ChangeOwnPasswordDto, LoginDto, SessionResponse } from './auth.schemas.js';
import { AuthService } from './auth.service.js';
import { LoginRateLimitGuard } from './login-rate-limit.guard.js';
import { SessionService } from './session.service.js';

const login = { body: LoginDto, response: SessionResponse } satisfies RouteSchema;
const me = { response: SessionResponse } satisfies RouteSchema;
const changePassword = { body: ChangeOwnPasswordDto } satisfies RouteSchema;

@Controller('/auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  /** Hands out the CSRF token the admin UI sends back on every state-changing request. */
  @Get('/csrf')
  csrf(ctx: Context) {
    const existing = readCookies(ctx.headers.cookie)[CSRF_COOKIE];
    const token = existing ?? this.sessions.newCsrfToken();
    if (!existing) ctx.setHeader('set-cookie', this.sessions.csrfCookie(token));
    return { data: { csrfToken: token } };
  }

  @Post('/login', { schema: login })
  @UseGuards(LoginRateLimitGuard)
  async login(ctx: RouteContext<typeof login>) {
    const user = await this.auth.login(ctx.input.body.email, ctx.input.body.password);
    const token = await this.sessions.issue(user);
    // A fresh CSRF token per session, so a token seen before sign-in is useless after it.
    ctx.setHeader('set-cookie', [
      this.sessions.sessionCookie(token),
      this.sessions.csrfCookie(this.sessions.newCsrfToken()),
    ]);
    return { data: user };
  }

  @Post('/logout')
  logout(ctx: Context) {
    ctx.setHeader('set-cookie', this.sessions.clearSessionCookie());
    return reply(undefined, { status: 204 });
  }

  @Get('/me', { schema: me })
  @UseGuards(AuthGuard)
  me(ctx: RouteContext<typeof me>) {
    return { data: ctx.need('user') };
  }

  @Post('/password', { schema: changePassword })
  @UseGuards(AuthGuard)
  async changePassword(ctx: RouteContext<typeof changePassword>) {
    const { currentPassword, newPassword } = ctx.input.body;
    const user = await this.auth.changeOwnPassword(ctx.need('user').id, currentPassword, newPassword);
    // Other sessions are now invalid; keep this one by issuing a new token.
    ctx.setHeader('set-cookie', this.sessions.sessionCookie(await this.sessions.issue(user)));
    return reply(undefined, { status: 204 });
  }
}
