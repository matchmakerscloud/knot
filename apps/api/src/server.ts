import { buildServer } from './app.js';
import { config } from './config/index.js';

async function start() {
  const server = await buildServer();

  try {
    await server.listen({ port: config.port, host: '0.0.0.0' });
    server.log.info(`Knot API listening on port ${config.port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
