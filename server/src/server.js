import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import apiRoutes from './routes/index.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// API Routes
app.use('/api', apiRoutes);

// Root route for API welcome
app.get('/', (req, res) => {
  res.json({
    name: 'Collections by Chandni API',
    version: '1.0.0',
    status: 'online',
    healthCheck: '/api/health',
  });
});

// 404 handler
app.use(notFoundHandler);

// Central error handler
app.use(errorHandler);

// Server startup
const PORT = config.port;

// Start server if not running inside a test runner
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`✨ Collections by Chandni API is running on http://localhost:${PORT}`);
    console.log(`   Health endpoint: http://localhost:${PORT}/api/health`);
  });
}

export default app;
