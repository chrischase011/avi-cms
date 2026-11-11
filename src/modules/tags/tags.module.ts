import { Module } from '@avijs/core';
import { DatabaseModule } from '../../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { TagsController } from './tags.controller.js';
import { TagsService } from './tags.service.js';

@Module({
  prefix: '/api',
  imports: [AuthModule, DatabaseModule],
  controllers: [TagsController],
  providers: [TagsService],
})
export class TagsModule {}
