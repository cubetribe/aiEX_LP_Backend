/**
 * Lead Routes
 * Defines API routes for lead management
 * Fixed for Railway deployment - v2.0
 */

'use strict';

/**
 * lead router
 */

// Define all routes manually to avoid createCoreRouter issues on Railway
// This file was completely rewritten to eliminate Strapi factory dependencies
module.exports = {
  routes: [
    // Standard CRUD routes (manually defined for stability)
    {
      method: 'GET',
      path: '/leads',
      handler: 'lead.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/leads/:id',
      handler: 'lead.findOne',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/leads',
      handler: 'lead.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/leads/:id',
      handler: 'lead.update',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/leads/:id',
      handler: 'lead.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // Frontend-optimized endpoints (public)
    {
      method: 'POST',
      path: '/leads/submit',
      handler: 'lead.submit',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/leads/:id/status',
      handler: 'lead.checkStatus',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/leads/:id/result-formatted',
      handler: 'lead.getFormattedResult',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/leads/:id/subscribe',
      handler: 'lead.subscribe',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    // Original endpoints
    {
      method: 'GET',
      path: '/leads/:id/result',
      handler: 'lead.getResult',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    // Admin endpoints
    {
      method: 'POST',
      path: '/leads/:id/reprocess',
      handler: 'lead.reprocess',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/leads/stats',
      handler: 'lead.getStats',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // AI Management endpoints
    {
      method: 'POST',
      path: '/leads/:id/process-ai',
      handler: 'lead.processWithAI',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/leads/ai-analytics',
      handler: 'lead.getAIAnalytics',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/leads/ai-providers/manage',
      handler: 'lead.manageAIProviders',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/leads/bulk-process',
      handler: 'lead.bulkProcessWithAI',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};