import { Module } from '@avijs/core';
import { DatabaseModule } from '../../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PagesModule } from '../pages/pages.module.js';
import { PostsModule } from '../posts/posts.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  prefix: '/api',
  imports: [AuthModule, DatabaseModule, PostsModule, PagesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
