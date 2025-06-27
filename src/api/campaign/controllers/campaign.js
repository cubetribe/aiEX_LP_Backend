'use strict';

/**
 * Campaign Controller
 * Handles campaign-related API endpoints including public frontend routes
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::campaign.campaign', ({ strapi }) => ({
  /**
   * Find public campaigns (active only)
   */
  async findPublic(ctx) {
    try {
      const campaigns = await strapi.entityService.findMany('api::campaign.campaign', {
        filters: {
          isActive: true,
          $or: [
            { status: 'active' },
            { status: null } // for backwards compatibility
          ]
        },
        fields: ['title', 'slug', 'description', 'campaignType'],
        sort: 'createdAt:desc'
      });

      return { data: campaigns };
    } catch (error) {
      strapi.log.error('Error finding public campaigns:', error);
      return ctx.internalServerError('Failed to fetch campaigns');
    }
  },

  /**
   * Find campaign by slug (for frontend)
   */
  async findBySlug(ctx) {
    const { slug } = ctx.params;

    try {
      const campaigns = await strapi.entityService.findMany('api::campaign.campaign', {
        filters: {
          slug,
          isActive: true
        },
        fields: ['title', 'slug', 'description', 'campaignType', 'status']
      });

      if (!campaigns || campaigns.length === 0) {
        return ctx.notFound('Campaign not found');
      }

      return { data: campaigns[0] };
    } catch (error) {
      strapi.log.error('Error finding campaign by slug:', error);
      return ctx.internalServerError('Failed to fetch campaign');
    }
  },

  /**
   * Submit lead to campaign
   */
  async submitLead(ctx) {
    const { slug } = ctx.params;
    const { firstName, email, responses } = ctx.request.body;

    try {
      // Validate required fields
      if (!firstName || !email) {
        return ctx.badRequest('firstName and email are required');
      }

      // Find campaign
      const campaigns = await strapi.entityService.findMany('api::campaign.campaign', {
        filters: {
          slug,
          isActive: true
        }
      });

      if (!campaigns || campaigns.length === 0) {
        return ctx.notFound('Campaign not found or inactive');
      }

      const campaign = campaigns[0];

      // Create lead using lead service
      const lead = await strapi.service('api::lead.lead').processLeadSubmission({
        firstName,
        email,
        responses: responses || {},
        campaign: campaign.id
      });

      strapi.log.info(`Lead submitted: ${email} to campaign ${slug}`);

      return { 
        data: {
          id: lead.id,
          leadScore: lead.leadScore,
          leadQuality: lead.leadQuality,
          message: 'Lead submitted successfully'
        }
      };
    } catch (error) {
      strapi.log.error('Error submitting lead:', error);
      return ctx.internalServerError('Failed to submit lead');
    }
  }
}));