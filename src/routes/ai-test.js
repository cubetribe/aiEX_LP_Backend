'use strict';

/**
 * AI Test Routes for Admin Panel
 * Provides endpoints for testing AI prompts and checking provider status
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/ai/test-prompt',
      handler: async (ctx) => {
        try {
          const { prompt, provider = 'openai' } = ctx.request.body;
          
          if (!prompt) {
            return ctx.badRequest('Prompt is required');
          }

          const aiService = require('../services/ai-provider.service');
          const startTime = Date.now();
          
          const result = await aiService.generateContent(
            prompt,
            { testMode: true },
            { provider, model: 'auto' }
          );
          
          const duration = Date.now() - startTime;
          
          return {
            success: true,
            provider: result.provider,
            model: result.model,
            response: result.content,
            metrics: {
              duration: `${duration}ms`,
              wordCount: result.content.split(' ').length,
              cost: result.cost || 'N/A'
            }
          };
        } catch (error) {
          strapi.log.error('AI test prompt failed:', error);
          return ctx.internalServerError(error.message);
        }
      },
      config: {
        auth: false, // Allow in admin panel
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'GET',
      path: '/ai/status',
      handler: async (ctx) => {
        try {
          const aiService = require('../services/ai-provider.service');
          
          return {
            providers: {
              openai: aiService.isConfigured.openai,
              anthropic: aiService.isConfigured.anthropic,
              gemini: aiService.isConfigured.gemini
            },
            defaultProvider: 'openai'
          };
        } catch (error) {
          return ctx.internalServerError(error.message);
        }
      },
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    }
  ]
};