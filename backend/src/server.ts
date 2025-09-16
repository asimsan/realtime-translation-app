import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config, isDevelopment } from '@/utils/config';
import { logger } from '@/utils/logger';
import { authenticateRequest, createRateLimiter, errorHandler } from '@/middleware/auth';
import translationRoutes from '@/routes/translation';
import realtimeRoutes from '@/routes/realtime';

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Allow embedding for Expo web
  contentSecurityPolicy: isDevelopment ? false : undefined,
}));

// CORS configuration
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID'],
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for audio data
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
if (isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const rateLimiter = createRateLimiter(
  config.rateLimit.windowMs,
  config.rateLimit.maxRequests
);
app.use('/api', rateLimiter);

// Authentication middleware for API routes
app.use('/api', authenticateRequest);

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV,
  });
});

// API routes
app.use('/api/translation', translationRoutes);
app.use('/api/realtime', realtimeRoutes);

// 404 handler
app.use('*', (req, res) => {
  logger.warn('Route not found', { path: req.originalUrl, method: req.method });
  
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV,
    corsOrigin: config.corsOrigin,
    rateLimit: config.rateLimit,
  });
  
  console.log(`🚀 Translation Backend Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/health`);
  console.log(`🌍 CORS origins: ${config.corsOrigin.join(', ')}`);
  
  if (isDevelopment) {
    console.log(`🔧 Development mode - detailed logging enabled`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;
