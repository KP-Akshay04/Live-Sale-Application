import http from 'http';
import { createApp } from './app.js';
import { env, validateEnvironment } from './config/env.js';
import { checkDatabaseConnection, disconnectDatabase } from './config/database.js';

async function bootstrap() {
  validateEnvironment();

  const app = createApp();
  const server = http.createServer(app);

  const port = env.port;

  // Initial database connectivity check
  console.log(`[Database] Checking MySQL connectivity via Prisma...`);
  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.connected) {
    console.log(`[Database] Connected to MySQL successfully (latency: ${dbStatus.latencyMs}ms).`);
  } else {
    console.warn(`[Database Warning] Could not connect to MySQL: ${dbStatus.error}`);
    console.warn(`[Database Warning] Ensure MySQL is running and DATABASE_URL is configured.`);
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(` BINDU Live Sale Backend Server Active`);
    console.log(` Environment: ${env.nodeEnv}`);
    console.log(` Port:        ${port}`);
    console.log(` Health URL:  http://localhost:${port}/api/health`);
    console.log(` Client URL:  ${env.clientUrl}`);
    console.log(`=======================================================`);
  });

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      await disconnectDatabase();
      console.log('[Server] Process exiting safely.');
      process.exit(0);
    });

    // Force exit if hanging
    setTimeout(() => {
      console.error('[Server] Forced shutdown due to timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  console.error('[Server Startup Fatal Error]:', error);
  process.exit(1);
});
