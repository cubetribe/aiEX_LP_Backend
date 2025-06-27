'use strict';

/**
 * Lead Routes
 * API routes for lead management
 */

module.exports = {
  routes: [
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
  ],
};