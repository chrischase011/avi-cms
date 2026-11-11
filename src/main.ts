import { AviFactory } from '@avijs/core';
import { appOptions } from './app.options.js';
import { AppModule } from './app.module.js';
import { Config } from './config.js';

const app = await AviFactory.create(AppModule, appOptions(await Config.load()));
await app.listen(app.get(Config).PORT);

const shutdown = () => {
  void app.close().then(() => process.exit(0));
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
