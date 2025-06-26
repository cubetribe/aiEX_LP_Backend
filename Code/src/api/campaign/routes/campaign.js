/**
 * Campaign Routes
 * Defines API routes for campaign management
 */

'use strict';

/**
 * campaign router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

// Create custom routes
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
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/campaigns/:slug/info',
      handler: 'campaign.getCampaignInfo',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/campaigns/:slug/validate',
      handler: 'campaign.validateCampaignSubmission',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
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
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/campaigns/:slug/submit',
      handler: 'campaign.submitLead',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/campaigns/:slug/leads/:leadId/status',
      handler: 'campaign.getLeadStatus',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    // Admin endpoints
    {
      method: 'GET',
      path: '/campaigns/:id/analytics',
      handler: 'campaign.getAnalytics',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};

// Try to create default router safely
let defaultRoutes = [];
try {
  const defaultRouter = createCoreRouter('api::campaign.campaign');
  if (defaultRouter && defaultRouter.routes) {
    defaultRoutes = defaultRouter.routes;
  }
} catch (error) {
  console.warn('Warning: Could not create default core router for campaign:', error.message);
  // Fallback to manual core routes
  defaultRoutes = [
    {
      method: 'GET',
      path: '/campaigns',
      handler: 'campaign.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/campaigns/:id',
      handler: 'campaign.findOne',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/campaigns',
      handler: 'campaign.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/campaigns/:id',
      handler: 'campaign.update',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/campaigns/:id',
      handler: 'campaign.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ];
}

// Merge default routes with custom routes
module.exports = {
  routes: [
    ...defaultRoutes,
    ...customRoutes.routes,
  ],
};