import { Module } from '@avijs/core';
import { DatabaseModule } from '../../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { MediaCoreModule } from '../media/media.module.js';
import { PostsController } from './posts.controller.js';
import { PostsService } from './posts.service.js';

@Module({
  prefix: '/api',
  imports: [AuthModule, DatabaseModule, MediaCoreModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
