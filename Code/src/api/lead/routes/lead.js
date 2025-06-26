/**
 * Lead Routes
 * Defines API routes for lead management
 */

'use strict';

/**
 * lead router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

const defaultRouter = createCoreRouter('api::lead.lead');

const customRoutes = {
  routes: [
    // Frontend-optimized endpoints (public)
    {
      method: 'POST',
      path: '/leads/submit',
      handler: 'lead.submit',
      config: {
        auth: false,
        policies: [],
        middlewares: ['api::lead.rate-limit', 'api::lead.validate-submission'],
      },
    },
    {
      method: 'GET',
      path: '/leads/:id/status',
      handler: 'lead.checkStatus',
      config: {
        auth: false,
        policies: [],
        middlewares: ['api::lead.rate-limit'],
      },
    },
    {
      method: 'GET',
      path: '/leads/:id/result-formatted',
      handler: 'lead.getFormattedResult',
      config: {
        auth: false,
        policies: [],
        middlewares: ['api::lead.rate-limit'],
      },
    },
    {
      method: 'GET',
      path: '/leads/:id/subscribe',
      handler: 'lead.subscribe',
      config: {
        auth: false,
        policies: [],
        middlewares: ['api::lead.rate-limit-sse'],
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
        middlewares: ['api::lead.rate-limit'],
      },
    },
    // Admin endpoints
    {
      method: 'POST',
      path: '/leads/:id/reprocess',
      handler: 'lead.reprocess',
      config: {
        policies: ['admin::is-owner'],
        middlewares: ['admin::audit-logs'],
      },
    },
    {
      method: 'GET',
      path: '/leads/stats',
      handler: 'lead.getStats',
      config: {
        policies: ['admin::is-owner'],
        middlewares: ['admin::audit-logs'],
      },
    },
    // AI Management endpoints
    {
      method: 'POST',
      path: '/leads/:id/process-ai',
      handler: 'lead.processWithAI',
      config: {
        policies: ['admin::is-owner'],
        middlewares: ['admin::audit-logs'],
      },
    },
    {
      method: 'GET',
      path: '/leads/ai-analytics',
      handler: 'lead.getAIAnalytics',
      config: {
        policies: ['admin::is-owner'],
        middlewares: ['admin::audit-logs'],
      },
    },
    {
      method: 'POST',
      path: '/leads/ai-providers/manage',
      handler: 'lead.manageAIProviders',
      config: {
        policies: ['admin::is-owner'],
        middlewares: ['admin::audit-logs'],
      },
    },
    {
      method: 'POST',
      path: '/leads/bulk-process',
      handler: 'lead.bulkProcessWithAI',
      config: {
        policies: ['admin::is-owner'],
        middlewares: ['admin::audit-logs'],
      },
    },
  ],
};

// Merge default routes with custom routes
module.exports = {
  routes: [
    ...defaultRouter.routes,
    ...customRoutes.routes,
  ],
};