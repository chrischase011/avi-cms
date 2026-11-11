import { Module } from '@avijs/core';
import { DatabaseModule } from '../../database/database.module.js';
import { MediaCoreModule } from '../media/media.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { PublicController } from './public.controller.js';
import { PublicService } from './public.service.js';

/** The headless, read-only content API: /api/public/*. */
@Module({
  prefix: '/api',
  imports: [DatabaseModule, MediaCoreModule, SettingsModule],
  providers: [PublicService],
  controllers: [PublicController],
})
export class PublicModule {}
