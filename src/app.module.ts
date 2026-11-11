import './inject.gen.js'; // dependency lists avi dev infers from constructors
import { Module } from '@avijs/core';
import { HealthController } from './common/health.controller.js';
import { WebController } from './common/web.controller.js';
import { Config } from './config.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { MediaModule, UploadsModule } from './modules/media/media.module.js';
import { PagesModule } from './modules/pages/pages.module.js';
import { PostsModule } from './modules/posts/posts.module.js';
import { PublicModule } from './modules/public/public.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { TagsModule } from './modules/tags/tags.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    Config.module,
    AuthModule,
    UsersModule,
    PostsModule,
    PagesModule,
    CategoriesModule,
    TagsModule,
    MediaModule,
    UploadsModule,
    SettingsModule,
    DashboardModule,
    PublicModule,
  ],
  controllers: [HealthController, WebController],
})
export class AppModule {}
