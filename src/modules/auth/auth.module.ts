import { Module } from '@avijs/core';
import { Config } from '../../config.js';
import { DatabaseModule } from '../../database/database.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SessionService } from './session.service.js';

/**
 * Sign-in, sessions and the guards. Feature modules import it so AuthGuard, which they attach
 * to their controllers, can resolve SessionService.
 */
@Module({
  prefix: '/api',
  imports: [Config.module, DatabaseModule],
  providers: [AuthService, SessionService],
  controllers: [AuthController],
  exports: [SessionService, AuthService, Config.module],
})
export class AuthModule {}
