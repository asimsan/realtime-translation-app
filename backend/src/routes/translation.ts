import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { OpenAIService } from '@/services/OpenAIService';
import { logger } from '@/utils/logger';
import { APIResponse, TranslationRequest, TranslationResponse } from '@/types';

const router = Router();
const openaiService = new OpenAIService();

// Validation middleware
const validateTranslationRequest = [
  body('text')
    .optional()
    .isString()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Text must be a string between 1 and 5000 characters'),
  
  body('sourceLanguage')
    .optional()
    .isIn(['auto', 'en', 'ne'])
    .withMessage('Source language must be auto, en, or ne'),
  
  body('targetLanguage')
    .isIn(['en', 'ne'])
    .withMessage('Target language must be en or ne'),
  
  body('audioData')
    .optional()
    .isString()
    .withMessage('Audio data must be a base64 encoded string'),
];

// POST /api/translation/text - Translate text
router.post('/text', validateTranslationRequest, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request parameters',
          details: errors.array(),
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      } as APIResponse);
    }

    const translationRequest: TranslationRequest = {
      text: req.body.text,
      sourceLanguage: req.body.sourceLanguage || 'auto',
      targetLanguage: req.body.targetLanguage,
      sessionId: req.sessionId,
    };

    if (!translationRequest.text) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TEXT',
          message: 'Text is required for translation',
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      } as APIResponse);
    }

    logger.info('Processing text translation', {
      sessionId: req.sessionId,
      requestId: req.requestId,
      sourceLanguage: translationRequest.sourceLanguage,
      targetLanguage: translationRequest.targetLanguage,
      textLength: translationRequest.text.length,
    });

    const result = await openaiService.translateText(translationRequest);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'TRANSLATION_FAILED',
          message: result.error || 'Translation failed',
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      } as APIResponse);
    }

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    } as APIResponse<TranslationResponse>);

  } catch (error) {
    logger.error('Translation endpoint error', {
      error: error.message,
      sessionId: req.sessionId,
      requestId: req.requestId,
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred during translation',
      },
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    } as APIResponse);
  }
});

// GET /api/translation/health - Health check
router.get('/health', async (req, res) => {
  try {
    logger.info('Health check requested', { requestId: req.requestId });

    const validation = await openaiService.validateApiKey();
    
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        openai: {
          isValid: validation.isValid,
          hasRealtimeAccess: validation.hasRealtimeAccess,
          error: validation.error,
        },
        version: '1.0.0',
      },
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    } as APIResponse);

  } catch (error) {
    logger.error('Health check failed', {
      error: error.message,
      requestId: req.requestId,
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed',
      },
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    } as APIResponse);
  }
});

export default router;
