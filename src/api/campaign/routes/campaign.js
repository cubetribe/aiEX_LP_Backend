/**
 * Campaign Routes
 * Defines API routes for campaign management
 * Fixed for Railway deployment - v2.0
 */

'use strict';

/**
 * campaign router
 */

// Define all routes manually to avoid createCoreRouter issues on Railway
// This file was completely rewritten to eliminate Strapi factory dependencies
module.exports = {
  routes: [
    // Standard CRUD routes (manually defined for stability)
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