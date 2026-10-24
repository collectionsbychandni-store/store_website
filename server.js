import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './server/src/routes/index.js';
import { securityHeaders, globalRateLimiter } from './server/src/middleware/securityMiddleware.js';
import { requestLogger } from './server/src/middleware/logger.js';
import { errorHandler } from './server/src/middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Security hardening: Disable server technology banner
  app.disable('x-powered-by');

  // Security HTTP Headers
  app.use(securityHeaders);

  // Global rate limiter for API requests
  app.use('/api', globalRateLimiter);

  // Safe request logging
  app.use(requestLogger);

  // Standard CORS & body parsing
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Mount backend API routes under /api
  app.use('/api', apiRoutes);

  // Central error handler for /api routes
  app.use('/api', errorHandler);

  // In development, mount Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve built dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✨ Collections by Chandni running at http://localhost:${PORT}`);
    console.log(`   API health check: http://localhost:${PORT}/api/health`);
    console.log(`   Admin Login: http://localhost:${PORT}/admin/login`);
  });

  // Graceful shutdown
  const handleShutdown = (signal) => {
    console.log(`Received ${signal}. Shutting down server gracefully...`);
    server.close(() => {
      console.log('Server closed gracefully.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

startServer();
