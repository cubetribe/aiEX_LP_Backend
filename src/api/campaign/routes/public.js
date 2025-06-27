'use strict';

/**
 * Public Campaign Routes
 * Frontend-accessible routes without authentication
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/campaigns/public',
      handler: 'campaign.findPublic',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/campaigns/public/:slug',
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
  ],
};