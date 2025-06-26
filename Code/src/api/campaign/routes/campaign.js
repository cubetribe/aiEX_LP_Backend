/**
 * Campaign Routes
 * Defines API routes for campaign management
 */

'use strict';

/**
 * campaign router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

const defaultRouter = createCoreRouter('api::campaign.campaign');

const customRoutes = {
  routes: [
    // Frontend-optimized endpoints (public)
    {
      method: 'GET',
      path: '/campaigns/:slug/public',
      handler: 'campaign.getPublicCampaign',
      config: {
        auth: false,
        policies: [],
        middlewares: ['api::campaign.rate-limit'],
      },
    },
    {
      method: 'GET',
      path: '/campaigns/:slug/info',
      handler: 'campaign.getCampaignInfo',
      config: {
        auth: false,
        policies: [],
        middlewares: ['api::campaign.rate-limit-light'],
      },
    },
    {
      method: 'POST',
      path: '/campaigns/:slug/validate',
      handler: 'campaign.validateCampaignSubmission',
      config: {
        auth: false,
        policies: [],
        middlewares: ['api::campaign.rate-limit'],
      },
    },
    // Original endpoints
    {
      method: 'GET',
      path: '/campaigns/:slug',
      handler: 'campaign.findBySlug',
      config: {
        auth: false,
        policies: [],
        middlewares: ['api::campaign.rate-limit'],
      },
    },
    {
      method: 'POST',
      path: '/campaigns/:slug/submit',
      handler: 'campaign.submitLead',
      config: {
        auth: false,
        policies: [],
        middlewares: ['api::campaign.rate-limit', 'api::campaign.validate-submission'],
      },
    },
    {
      method: 'GET',
      path: '/campaigns/:slug/leads/:leadId/status',
      handler: 'campaign.getLeadStatus',
      config: {
        auth: false,
        policies: [],
        middlewares: ['api::campaign.rate-limit'],
      },
    },
    // Admin endpoints
    {
      method: 'GET',
      path: '/campaigns/:id/analytics',
      handler: 'campaign.getAnalytics',
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