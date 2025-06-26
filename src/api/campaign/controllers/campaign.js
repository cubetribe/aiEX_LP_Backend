/**
 * Campaign Controller
 * Handles campaign-related API endpoints for GoAIX platform
 */

'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { ValidationError } = require('@strapi/utils').errors;
const Joi = require('joi');

/**
 * Campaign controller with custom endpoints for lead generation
 */
module.exports = createCoreController('api::campaign.campaign', ({ strapi }) => ({

  /**
   * Find active campaigns
   * GET /api/campaigns
   */
  async find(ctx) {
    // Only return active and public campaigns for public API
    const { query } = ctx;
    const filteredQuery = {
      ...query,
      filters: {
        ...query.filters,
        isActive: true,
        isPublic: true,
      },
    };

    ctx.query = filteredQuery;
    return super.find(ctx);
  },

  /**
   * Get campaign data optimized for frontend
   * GET /api/campaigns/:slug/public
   */
  async getPublicCampaign(ctx) {
    const { slug } = ctx.params;

    try {
      // Validate slug parameter
      const slugSchema = Joi.string().alphanum().min(3).max(100).required();
      const { error } = slugSchema.validate(slug);
      
      if (error) {
        return ctx.badRequest('Invalid campaign identifier');
      }

      // Find campaign with optimized data for frontend
      const campaigns = await strapi.entityService.findMany('api::campaign.campaign', {
        filters: {
          slug: slug,
          isActive: true,
          isPublic: true,
        },
        populate: {
          leads: {
            count: true,
          },
        },
      });

      if (!campaigns || campaigns.length === 0) {
        return ctx.notFound('Campaign not found or not available');
      }

      const campaign = campaigns[0];

      // Check campaign timing constraints
      const now = new Date();
      const isActive = this.validateCampaignTiming(campaign, now);
      
      if (!isActive.valid) {
        return ctx.forbidden(isActive.message);
      }

      // Check capacity constraints
      const hasCapacity = this.validateCampaignCapacity(campaign);
      if (!hasCapacity.valid) {
        return ctx.forbidden(hasCapacity.message);
      }

      // Prepare frontend-optimized response
      const frontendCampaign = {
        id: campaign.id,
        slug: campaign.slug,
        title: campaign.title,
        description: campaign.description,
        campaignType: campaign.campaignType,
        config: this.sanitizeConfigForFrontend(campaign.config),
        styling: {
          cssCustomization: campaign.cssCustomization,
          successRedirectUrl: campaign.successRedirectUrl,
          errorRedirectUrl: campaign.errorRedirectUrl,
        },
        metadata: {
          leadCount: campaign.currentLeadCount || 0,
          maxLeads: campaign.maxLeads,
          conversionGoal: campaign.conversionGoal,
          isLimitedCapacity: !!campaign.maxLeads,
          capacityPercentage: campaign.maxLeads ? 
            Math.round((campaign.currentLeadCount / campaign.maxLeads) * 100) : 0,
        },
        timing: {
          isActive: true,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          hasTimeLimit: !!(campaign.startDate || campaign.endDate),
        },
        tracking: {
          trackingPixel: campaign.trackingPixel,
          tags: campaign.tags || [],
        },
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      };

      // Add performance metrics
      const metrics = await this.getCampaignMetrics(campaign.id);
      frontendCampaign.metrics = metrics;

      // Cache the response for better performance
      ctx.set('Cache-Control', 'public, max-age=300'); // 5 minutes cache

      return ctx.send({
        success: true,
        data: frontendCampaign,
      });

    } catch (error) {
      strapi.log.error('❌ Error getting public campaign:', error);
      return ctx.internalServerError('Failed to load campaign');
    }
  },

  /**
   * Get lightweight campaign info for frontend routing
   * GET /api/campaigns/:slug/info
   */
  async getCampaignInfo(ctx) {
    const { slug } = ctx.params;

    try {
      const campaigns = await strapi.entityService.findMany('api::campaign.campaign', {
        filters: {
          slug: slug,
          isActive: true,
          isPublic: true,
        },
        fields: ['id', 'slug', 'title', 'campaignType', 'isActive', 'startDate', 'endDate', 'maxLeads', 'currentLeadCount'],
      });

      if (!campaigns || campaigns.length === 0) {
        return ctx.notFound('Campaign not found');
      }

      const campaign = campaigns[0];
      
      // Quick validation
      const now = new Date();
      const isValid = this.validateCampaignTiming(campaign, now).valid && 
                     this.validateCampaignCapacity(campaign).valid;

      const info = {
        id: campaign.id,
        slug: campaign.slug,
        title: campaign.title,
        type: campaign.campaignType,
        isAvailable: isValid,
        hasCapacityLimit: !!campaign.maxLeads,
        capacityRemaining: campaign.maxLeads ? 
          Math.max(0, campaign.maxLeads - campaign.currentLeadCount) : null,
      };

      // Aggressive caching for info endpoint
      ctx.set('Cache-Control', 'public, max-age=600'); // 10 minutes cache

      return ctx.send({
        success: true,
        data: info,
      });

    } catch (error) {
      strapi.log.error('❌ Error getting campaign info:', error);
      return ctx.internalServerError('Failed to get campaign info');
    }
  },

  /**
   * Validate campaign submission before form display
   * POST /api/campaigns/:slug/validate
   */
  async validateCampaignSubmission(ctx) {
    const { slug } = ctx.params;

    try {
      const campaigns = await strapi.entityService.findMany('api::campaign.campaign', {
        filters: {
          slug: slug,
          isActive: true,
          isPublic: true,
        },
        fields: ['id', 'slug', 'title', 'campaignType', 'maxLeads', 'currentLeadCount', 'startDate', 'endDate'],
      });

      if (!campaigns || campaigns.length === 0) {
        return ctx.send({
          success: false,
          valid: false,
          reason: 'Campaign not found',
        });
      }

      const campaign = campaigns[0];
      const now = new Date();

      // Validate timing
      const timingValidation = this.validateCampaignTiming(campaign, now);
      if (!timingValidation.valid) {
        return ctx.send({
          success: false,
          valid: false,
          reason: timingValidation.message,
        });
      }

      // Validate capacity
      const capacityValidation = this.validateCampaignCapacity(campaign);
      if (!capacityValidation.valid) {
        return ctx.send({
          success: false,
          valid: false,
          reason: capacityValidation.message,
        });
      }

      return ctx.send({
        success: true,
        valid: true,
        campaign: {
          id: campaign.id,
          slug: campaign.slug,
          title: campaign.title,
          type: campaign.campaignType,
        },
      });

    } catch (error) {
      strapi.log.error('❌ Campaign validation error:', error);
      return ctx.send({
        success: false,
        valid: false,
        reason: 'Validation failed',
      });
    }
  },

  /**
   * Find campaign by slug (Original endpoint)
   * GET /api/campaigns/:slug
   */
  async findBySlug(ctx) {
    const { slug } = ctx.params;

    try {
      // Validate slug parameter
      const slugSchema = Joi.string().alphanum().min(3).max(100).required();
      const { error } = slugSchema.validate(slug);
      
      if (error) {
        throw new ValidationError('Invalid slug format');
      }

      // Find campaign by slug
      const campaign = await strapi.entityService.findMany('api::campaign.campaign', {
        filters: {
          slug: slug,
          isActive: true,
          isPublic: true,
        },
        populate: {
          leads: {
            count: true,
          },
        },
      });

      if (!campaign || campaign.length === 0) {
        return ctx.notFound('Campaign not found');
      }

      const campaignData = campaign[0];

      // Check if campaign is within date range
      const now = new Date();
      if (campaignData.startDate && new Date(campaignData.startDate) > now) {
        return ctx.forbidden('Campaign has not started yet');
      }
      
      if (campaignData.endDate && new Date(campaignData.endDate) < now) {
        return ctx.forbidden('Campaign has ended');
      }

      // Check if max leads reached
      if (campaignData.maxLeads && campaignData.currentLeadCount >= campaignData.maxLeads) {
        return ctx.forbidden('Campaign has reached maximum lead capacity');
      }

      // Remove sensitive data from public response
      const publicCampaign = {
        id: campaignData.id,
        slug: campaignData.slug,
        title: campaignData.title,
        description: campaignData.description,
        campaignType: campaignData.campaignType,
        config: campaignData.config,
        cssCustomization: campaignData.cssCustomization,
        successRedirectUrl: campaignData.successRedirectUrl,
        trackingPixel: campaignData.trackingPixel,
        leadCount: campaignData.currentLeadCount,
        maxLeads: campaignData.maxLeads,
        createdAt: campaignData.createdAt,
        updatedAt: campaignData.updatedAt,
      };

      return ctx.send({ data: publicCampaign });
    } catch (error) {
      strapi.log.error('Error finding campaign by slug:', error);
      throw error;
    }
  },

  /**
   * Submit lead for campaign
   * POST /api/campaigns/:slug/submit
   */
  async submitLead(ctx) {
    const { slug } = ctx.params;
    const { body } = ctx.request;

    try {
      // Validate input data
      const leadSchema = Joi.object({
        firstName: Joi.string().min(1).max(100).required(),
        lastName: Joi.string().max(100).optional(),
        email: Joi.string().email().max(255).required(),
        phone: Joi.string().pattern(/^[+]?[0-9\s\-\(\)]+$/).max(20).optional(),
        company: Joi.string().max(200).optional(),
        jobTitle: Joi.string().max(100).optional(),
        responses: Joi.object().required(),
        consentGiven: Joi.boolean().required(),
        marketingOptIn: Joi.boolean().optional(),
        customFields: Joi.object().optional(),
      });

      const { error, value } = leadSchema.validate(body);
      if (error) {
        throw new ValidationError(`Validation error: ${error.details[0].message}`);
      }

      // Check consent
      if (!value.consentGiven) {
        throw new ValidationError('User consent is required');
      }

      // Find campaign
      const campaigns = await strapi.entityService.findMany('api::campaign.campaign', {
        filters: {
          slug: slug,
          isActive: true,
          isPublic: true,
        },
      });

      if (!campaigns || campaigns.length === 0) {
        return ctx.notFound('Campaign not found');
      }

      const campaign = campaigns[0];

      // Check campaign constraints
      const now = new Date();
      if (campaign.startDate && new Date(campaign.startDate) > now) {
        return ctx.forbidden('Campaign has not started yet');
      }
      
      if (campaign.endDate && new Date(campaign.endDate) < now) {
        return ctx.forbidden('Campaign has ended');
      }

      if (campaign.maxLeads && campaign.currentLeadCount >= campaign.maxLeads) {
        return ctx.forbidden('Campaign has reached maximum lead capacity');
      }

      // Extract tracking information
      const trackingData = {
        ipAddress: ctx.request.ip,
        userAgent: ctx.request.headers['user-agent'],
        referrer: ctx.request.headers.referer,
        utmSource: ctx.query.utm_source,
        utmMedium: ctx.query.utm_medium,
        utmCampaign: ctx.query.utm_campaign,
        utmTerm: ctx.query.utm_term,
        utmContent: ctx.query.utm_content,
      };

      // Create lead data
      const leadData = {
        ...value,
        campaign: campaign.id,
        consentTimestamp: new Date(),
        ...trackingData,
      };

      // Create lead
      const lead = await strapi.entityService.create('api::lead.lead', {
        data: leadData,
      });

      // Update campaign lead count
      await strapi.entityService.update('api::campaign.campaign', campaign.id, {
        data: {
          currentLeadCount: campaign.currentLeadCount + 1,
        },
      });

      // Queue AI processing job
      const queueService = strapi.service('api::queue.queue');
      await queueService.addAIProcessingJob({
        leadId: lead.id,
        campaignId: campaign.id,
      });

      // Queue Google Sheets export job if configured
      if (campaign.googleSheetId) {
        await queueService.addSheetsExportJob({
          leadId: lead.id,
          campaignId: campaign.id,
        });
      }

      // Return success response without sensitive data
      return ctx.send({
        success: true,
        message: 'Lead submitted successfully',
        data: {
          id: lead.id,
          firstName: lead.firstName,
          email: lead.email,
          processingStatus: 'queued',
        },
      });

    } catch (error) {
      strapi.log.error('Error submitting lead:', error);
      
      if (error instanceof ValidationError) {
        return ctx.badRequest(error.message);
      }
      
      throw error;
    }
  },

  /**
   * Get lead processing status
   * GET /api/campaigns/:slug/leads/:leadId/status
   */
  async getLeadStatus(ctx) {
    const { slug, leadId } = ctx.params;

    try {
      // Validate parameters
      const paramsSchema = Joi.object({
        slug: Joi.string().alphanum().min(3).max(100).required(),
        leadId: Joi.number().integer().positive().required(),
      });

      const { error } = paramsSchema.validate({ slug, leadId: parseInt(leadId) });
      if (error) {
        throw new ValidationError('Invalid parameters');
      }

      // Find lead
      const leads = await strapi.entityService.findMany('api::lead.lead', {
        filters: {
          id: leadId,
          campaign: {
            slug: slug,
          },
        },
        populate: ['campaign'],
      });

      if (!leads || leads.length === 0) {
        return ctx.notFound('Lead not found');
      }

      const lead = leads[0];

      // Return status information
      const statusData = {
        id: lead.id,
        processingStatus: lead.aiProcessingStatus,
        emailSent: lead.emailSent,
        googleSheetsExported: lead.googleSheetsExported,
        hasResult: !!lead.aiResult,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
      };

      return ctx.send({ data: statusData });

    } catch (error) {
      strapi.log.error('Error getting lead status:', error);
      throw error;
    }
  },

  /**
   * Get campaign analytics (Admin only)
   * GET /api/campaigns/:id/analytics
   */
  async getAnalytics(ctx) {
    const { id } = ctx.params;

    try {
      // This endpoint requires admin authentication
      // Implementation would include detailed analytics
      const campaign = await strapi.entityService.findOne('api::campaign.campaign', id, {
        populate: {
          leads: {
            select: ['id', 'createdAt', 'aiProcessingStatus', 'leadQuality', 'leadScore'],
          },
        },
      });

      if (!campaign) {
        return ctx.notFound('Campaign not found');
      }

      // Calculate analytics
      const analytics = {
        totalLeads: campaign.leads.length,
        leadsByStatus: {},
        leadsByQuality: {},
        averageLeadScore: 0,
        conversionRate: 0,
        // Additional analytics calculations...
      };

      // Process leads for analytics
      campaign.leads.forEach(lead => {
        // Count by status
        analytics.leadsByStatus[lead.aiProcessingStatus] = 
          (analytics.leadsByStatus[lead.aiProcessingStatus] || 0) + 1;

        // Count by quality
        analytics.leadsByQuality[lead.leadQuality] = 
          (analytics.leadsByQuality[lead.leadQuality] || 0) + 1;
      });

      return ctx.send({ data: analytics });

    } catch (error) {
      strapi.log.error('Error getting campaign analytics:', error);
      throw error;
    }
  },

  /**
   * Validate campaign timing constraints
   * @param {Object} campaign - Campaign object
   * @param {Date} now - Current date
   * @returns {Object} Validation result
   */
  validateCampaignTiming(campaign, now) {
    if (campaign.startDate && new Date(campaign.startDate) > now) {
      return {
        valid: false,
        message: 'Campaign has not started yet',
      };
    }
    
    if (campaign.endDate && new Date(campaign.endDate) < now) {
      return {
        valid: false,
        message: 'Campaign has ended',
      };
    }

    return { valid: true };
  },

  /**
   * Validate campaign capacity constraints
   * @param {Object} campaign - Campaign object
   * @returns {Object} Validation result
   */
  validateCampaignCapacity(campaign) {
    if (campaign.maxLeads && campaign.currentLeadCount >= campaign.maxLeads) {
      return {
        valid: false,
        message: 'Campaign has reached maximum capacity',
      };
    }

    return { valid: true };
  },

  /**
   * Sanitize campaign config for frontend consumption
   * @param {Object} config - Campaign configuration
   * @returns {Object} Sanitized configuration
   */
  sanitizeConfigForFrontend(config) {
    if (!config) return {};

    try {
      // Remove sensitive information and keep only frontend-needed data
      const sanitized = { ...config };
      
      // Remove backend-only configurations
      delete sanitized.internalSettings;
      delete sanitized.adminNotes;
      delete sanitized.serverSideConfig;
      
      // Ensure questions don't contain sensitive information
      if (sanitized.questions && Array.isArray(sanitized.questions)) {
        sanitized.questions = sanitized.questions.map(question => ({
          id: question.id,
          question: question.question,
          type: question.type,
          options: question.options,
          required: question.required,
          placeholder: question.placeholder,
          validation: question.validation,
        }));
      }

      return sanitized;
    } catch (error) {
      strapi.log.warn('⚠️ Error sanitizing config:', error);
      return {};
    }
  },

  /**
   * Get campaign performance metrics
   * @param {number} campaignId - Campaign ID
   * @returns {Object} Performance metrics
   */
  async getCampaignMetrics(campaignId) {
    try {
      // Get basic lead statistics
      const leads = await strapi.entityService.findMany('api::lead.lead', {
        filters: { campaign: campaignId },
        fields: ['aiProcessingStatus', 'leadQuality', 'leadScore', 'emailSent', 'createdAt'],
      });

      const totalLeads = leads.length;
      if (totalLeads === 0) {
        return {
          totalLeads: 0,
          conversionRate: 0,
          averageScore: 0,
          processingSuccess: 0,
          recentActivity: 0,
        };
      }

      // Calculate metrics
      const completedProcessing = leads.filter(l => l.aiProcessingStatus === 'completed').length;
      const emailsSent = leads.filter(l => l.emailSent).length;
      const averageScore = leads.reduce((sum, l) => sum + (l.leadScore || 0), 0) / totalLeads;
      
      // Recent activity (last 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentActivity = leads.filter(l => new Date(l.createdAt) > yesterday).length;

      // Quality distribution
      const qualityDistribution = leads.reduce((acc, lead) => {
        const quality = lead.leadQuality || 'unqualified';
        acc[quality] = (acc[quality] || 0) + 1;
        return acc;
      }, {});

      return {
        totalLeads,
        conversionRate: totalLeads > 0 ? Math.round((emailsSent / totalLeads) * 100) : 0,
        averageScore: Math.round(averageScore * 10) / 10,
        processingSuccess: totalLeads > 0 ? Math.round((completedProcessing / totalLeads) * 100) : 0,
        recentActivity,
        qualityDistribution,
      };

    } catch (error) {
      strapi.log.warn('⚠️ Error getting campaign metrics:', error);
      return {
        totalLeads: 0,
        conversionRate: 0,
        averageScore: 0,
        processingSuccess: 0,
        recentActivity: 0,
      };
    }
  },

}));