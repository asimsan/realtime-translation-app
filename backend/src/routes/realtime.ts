import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { OpenAIService } from '@/services/OpenAIService';
import { logger } from '@/utils/logger';
import { APIResponse } from '@/types';

const router = Router();
const openaiService = new OpenAIService();

// POST /api/realtime/token - Get ephemeral client secret for WebSocket connection
router.post('/token', async (req, res) => {
  try {
    const sessionId = req.sessionId;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_SESSION_ID',
          message: 'Session ID is required',
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      } as APIResponse);
    }

    logger.info('Requesting ephemeral token', {
      sessionId,
      requestId: req.requestId,
    });

    const tokenData = await openaiService.getEphemeralToken(sessionId);

    res.json({
      success: true,
      data: {
        clientSecret: tokenData.clientSecret,
        expiresAt: tokenData.expiresAt.toISOString(),
        websocketUrl: 'wss://api.openai.com/v1/realtime?model=gpt-realtime',
        protocols: ['realtime', `openai-insecure-api-key.${tokenData.clientSecret}`],
        sessionId,
      },
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    } as APIResponse);

  } catch (error) {
    logger.error('Failed to get ephemeral token', {
      error: error.message,
      sessionId: req.sessionId,
      requestId: req.requestId,
    });

    // Determine appropriate error code based on the error
    let statusCode = 500;
    let errorCode = 'TOKEN_GENERATION_FAILED';
    
    if (error.message.includes('403')) {
      statusCode = 403;
      errorCode = 'REALTIME_ACCESS_DENIED';
    } else if (error.message.includes('401')) {
      statusCode = 401;
      errorCode = 'INVALID_API_KEY';
    } else if (error.message.includes('429')) {
      statusCode = 429;
      errorCode = 'RATE_LIMIT_EXCEEDED';
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: error.message,
      },
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    } as APIResponse);
  }
});

// GET /api/realtime/status - Check realtime API status
router.get('/status', async (req, res) => {
  try {
    logger.info('Checking realtime status', { requestId: req.requestId });

    const validation = await openaiService.validateApiKey();

    res.json({
      success: true,
      data: {
        available: validation.hasRealtimeAccess,
        basicAccess: validation.isValid,
        error: validation.error,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    } as APIResponse);

  } catch (error) {
    logger.error('Realtime status check failed', {
      error: error.message,
      requestId: req.requestId,
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_CHECK_FAILED',
        message: 'Failed to check realtime status',
      },
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    } as APIResponse);
  }
});

export default router;
