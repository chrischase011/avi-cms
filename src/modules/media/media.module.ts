import { Module, defineFactory } from '@avijs/core';
import { Config } from '../../config.js';
import { DatabaseModule } from '../../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { MediaController } from './media.controller.js';
import { MediaPresenter } from './media.presenter.js';
import { MediaService } from './media.service.js';
import { FileStorage, createLocalStorage } from './storage.js';
import { UploadsController } from './uploads.controller.js';

const storageProvider = defineFactory({
  provide: FileStorage,
  inject: [Config],
  // Swap this factory for an S3-compatible driver; nothing else changes.
  useFactory: (config) => createLocalStorage(config.UPLOAD_DIR),
});

/** Storage and URLs, shared by every module that shows media. */
@Module({
  imports: [Config.module],
  providers: [storageProvider, MediaPresenter],
  exports: [FileStorage, MediaPresenter],
})
export class MediaCoreModule {}

@Module({
  prefix: '/api',
  imports: [AuthModule, DatabaseModule, MediaCoreModule],
  providers: [MediaService],
  controllers: [MediaController],
})
export class MediaModule {}

/** GET /uploads/:key, outside the /api prefix. */
@Module({ imports: [MediaCoreModule], controllers: [UploadsController] })
export class UploadsModule {}
