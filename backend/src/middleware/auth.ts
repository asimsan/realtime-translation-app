import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

// Simple API key authentication middleware
// In production, you might want to use JWT tokens, OAuth, or other auth methods
export const authenticateRequest = (req: Request, res: Response, next: NextFunction): void => {
  // For now, we'll use a simple session-based approach
  // You can enhance this with proper authentication as needed
  
  const sessionId = req.headers['x-session-id'] as string;
  const userAgent = req.headers['user-agent'];
  
  // Basic request validation
  if (!sessionId && req.path.includes('/realtime/')) {
    logger.warn('Missing session ID for realtime request', { 
      path: req.path, 
      ip: req.ip,
      userAgent 
    });
    
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_SESSION_ID',
        message: 'Session ID is required for realtime operations',
      },
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
    });
    return;
  }

  // Log the request
  logger.info('Authenticated request', {
    sessionId,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: userAgent?.substring(0, 100), // Truncate long user agents
  });

  // Add session info to request
  req.sessionId = sessionId;
  req.requestId = generateRequestId();
  
  next();
};

// Rate limiting middleware
export const createRateLimiter = (windowMs: number, maxRequests: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.ip + (req.sessionId || '');
    const now = Date.now();
    
    // Clean up expired entries
    for (const [key, value] of requests.entries()) {
      if (now > value.resetTime) {
        requests.delete(key);
      }
    }

    const clientData = requests.get(identifier);
    
    if (!clientData) {
      // First request from this client
      requests.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (maxRequests - 1).toString());
      res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
      
      return next();
    }

    if (now > clientData.resetTime) {
      // Reset the rate limit window
      clientData.count = 1;
      clientData.resetTime = now + windowMs;
      
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (maxRequests - 1).toString());
      res.setHeader('X-RateLimit-Reset', new Date(clientData.resetTime).toISOString());
      
      return next();
    }

    if (clientData.count >= maxRequests) {
      // Rate limit exceeded
      logger.warn('Rate limit exceeded', {
        identifier,
        count: clientData.count,
        limit: maxRequests,
        resetTime: new Date(clientData.resetTime).toISOString(),
      });

      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', new Date(clientData.resetTime).toISOString());
      res.setHeader('Retry-After', Math.ceil((clientData.resetTime - now) / 1000).toString());

      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }

    // Increment request count
    clientData.count++;
    
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', (maxRequests - clientData.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(clientData.resetTime).toISOString());

    next();
  };
};

// Error handling middleware
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    sessionId: req.sessionId,
    requestId: req.requestId,
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isDevelopment ? err.message : 'An internal server error occurred',
      ...(isDevelopment && { stack: err.stack }),
    },
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
};

// Request ID generator
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      sessionId?: string;
      requestId?: string;
    }
  }
}
