'use strict';

/**
 * Lead Controller
 * Basic CRUD operations for lead management
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::lead.lead', ({ strapi }) => ({
  /**
   * Create a new lead
   */
  async create(ctx) {
    const { data } = ctx.request.body;
    
    try {
      // Basic validation
      if (!data.firstName || !data.email || !data.campaign) {
        return ctx.badRequest('firstName, email, and campaign are required');
      }

      // Create the lead
      const lead = await strapi.entityService.create('api::lead.lead', {
        data: {
          ...data,
          responses: data.responses || {},
          leadScore: 0,
          leadQuality: 'cold'
        },
        populate: ['campaign']
      });

      return { data: lead };
    } catch (error) {
      strapi.log.error('Error creating lead:', error);
      return ctx.internalServerError('Failed to create lead');
    }
  },

  /**
   * Find leads with filtering
   */
  async find(ctx) {
    try {
      const { results, pagination } = await strapi.entityService.findMany('api::lead.lead', {
        ...ctx.query,
        populate: ['campaign']
      });

      return {
        data: results,
        meta: { pagination }
      };
    } catch (error) {
      strapi.log.error('Error finding leads:', error);
      return ctx.internalServerError('Failed to fetch leads');
    }
  },

  /**
   * Find one lead by ID
   */
  async findOne(ctx) {
    const { id } = ctx.params;

    try {
      const lead = await strapi.entityService.findOne('api::lead.lead', id, {
        populate: ['campaign']
      });

      if (!lead) {
        return ctx.notFound('Lead not found');
      }

      return { data: lead };
    } catch (error) {
      strapi.log.error('Error finding lead:', error);
      return ctx.internalServerError('Failed to fetch lead');
    }
  },

  /**
   * Update a lead
   */
  async update(ctx) {
    const { id } = ctx.params;
    const { data } = ctx.request.body;

    try {
      const lead = await strapi.entityService.update('api::lead.lead', id, {
        data,
        populate: ['campaign']
      });

      return { data: lead };
    } catch (error) {
      strapi.log.error('Error updating lead:', error);
      return ctx.internalServerError('Failed to update lead');
    }
  },

  /**
   * Delete a lead
   */
  async delete(ctx) {
    const { id } = ctx.params;

    try {
      const lead = await strapi.entityService.delete('api::lead.lead', id);
      return { data: lead };
    } catch (error) {
      strapi.log.error('Error deleting lead:', error);
      return ctx.internalServerError('Failed to delete lead');
    }
  }
}));