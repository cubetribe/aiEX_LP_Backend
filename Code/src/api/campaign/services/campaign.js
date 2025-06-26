/**
 * Campaign Service
 * Business logic for campaign management
 */

'use strict';

const { createCoreService } = require('@strapi/strapi').factories;

/**
 * Campaign service with custom business logic
 */
module.exports = createCoreService('api::campaign.campaign', ({ strapi }) => ({

  /**
   * Find active campaigns with filtering
   * @param {Object} params - Query parameters
   * @returns {Array} Filtered campaigns
   */
  async findActiveCampaigns(params = {}) {
    try {
      const campaigns = await strapi.entityService.findMany('api::campaign.campaign', {
        ...params,
        filters: {
          ...params.filters,
          isActive: true,
          isPublic: true,
        },
        populate: {
          leads: {
            count: true,
          },
        },
      });

      return campaigns;
    } catch (error) {
      strapi.log.error('Error finding active campaigns:', error);
      throw error;
    }
  },

  /**
   * Find campaign by slug with validation
   * @param {string} slug - Campaign slug
   * @returns {Object|null} Campaign data or null
   */
  async findBySlugWithValidation(slug) {
    try {
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
        return null;
      }

      const campaign = campaigns[0];

      // Validate campaign timing
      const now = new Date();
      if (campaign.startDate && new Date(campaign.startDate) > now) {
        throw new Error('Campaign has not started yet');
      }
      
      if (campaign.endDate && new Date(campaign.endDate) < now) {
        throw new Error('Campaign has ended');
      }

      // Validate lead capacity
      if (campaign.maxLeads && campaign.currentLeadCount >= campaign.maxLeads) {
        throw new Error('Campaign has reached maximum lead capacity');
      }

      return campaign;
    } catch (error) {
      strapi.log.error('Error finding campaign by slug:', error);
      throw error;
    }
  },

  /**
   * Validate campaign configuration
   * @param {Object} config - Campaign configuration
   * @param {string} campaignType - Type of campaign
   * @returns {boolean} Validation result
   */
  validateCampaignConfig(config, campaignType) {
    try {
      switch (campaignType) {
        case 'quiz':
          return this.validateQuizConfig(config);
        case 'chatbot':
          return this.validateChatbotConfig(config);
        case 'imageUpload':
          return this.validateImageUploadConfig(config);
        case 'textOnly':
          return this.validateTextOnlyConfig(config);
        case 'custom':
          return this.validateCustomConfig(config);
        default:
          return false;
      }
    } catch (error) {
      strapi.log.error('Error validating campaign config:', error);
      return false;
    }
  },

  /**
   * Validate quiz configuration
   * @param {Object} config - Quiz configuration
   * @returns {boolean} Validation result
   */
  validateQuizConfig(config) {
    if (!config.questions || !Array.isArray(config.questions)) {
      return false;
    }

    if (config.questions.length === 0) {
      return false;
    }

    return config.questions.every(question => {
      return question.id && 
             question.question && 
             question.type && 
             (question.type !== 'multiple-choice' || question.options);
    });
  },

  /**
   * Validate chatbot configuration
   * @param {Object} config - Chatbot configuration
   * @returns {boolean} Validation result
   */
  validateChatbotConfig(config) {
    return config.initialMessage && 
           config.conversationFlow && 
           typeof config.conversationFlow.maxMessages === 'number';
  },

  /**
   * Validate image upload configuration
   * @param {Object} config - Image upload configuration
   * @returns {boolean} Validation result
   */
  validateImageUploadConfig(config) {
    return config.allowedTypes && 
           Array.isArray(config.allowedTypes) && 
           config.maxFileSize && 
           typeof config.maxFileSize === 'number';
  },

  /**
   * Validate text-only configuration
   * @param {Object} config - Text-only configuration
   * @returns {boolean} Validation result
   */
  validateTextOnlyConfig(config) {
    return config.fields && 
           Array.isArray(config.fields) && 
           config.fields.length > 0;
  },

  /**
   * Validate custom configuration
   * @param {Object} config - Custom configuration
   * @returns {boolean} Validation result
   */
  validateCustomConfig(config) {
    // Custom configurations are flexible, just check basic structure
    return typeof config === 'object' && config !== null;
  },

  /**
   * Update campaign statistics
   * @param {number} campaignId - Campaign ID
   * @param {Object} stats - Statistics to update
   * @returns {Object} Updated campaign
   */
  async updateCampaignStats(campaignId, stats) {
    try {
      const campaign = await strapi.entityService.findOne('api::campaign.campaign', campaignId);
      
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const updatedCampaign = await strapi.entityService.update('api::campaign.campaign', campaignId, {
        data: {
          currentLeadCount: stats.leadCount || campaign.currentLeadCount,
          ...stats,
        },
      });

      return updatedCampaign;
    } catch (error) {
      strapi.log.error('Error updating campaign stats:', error);
      throw error;
    }
  },

  /**
   * Calculate campaign analytics
   * @param {number} campaignId - Campaign ID
   * @returns {Object} Campaign analytics
   */
  async calculateAnalytics(campaignId) {
    try {
      const campaign = await strapi.entityService.findOne('api::campaign.campaign', campaignId, {
        populate: {
          leads: {
            select: [
              'id', 'createdAt', 'aiProcessingStatus', 'leadQuality', 
              'leadScore', 'emailSent', 'googleSheetsExported', 'conversionValue'
            ],
          },
        },
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const leads = campaign.leads || [];
      const totalLeads = leads.length;

      // Calculate basic metrics
      const analytics = {
        totalLeads,
        leadsByStatus: {},
        leadsByQuality: {},
        averageLeadScore: 0,
        totalConversionValue: 0,
        emailsSent: 0,
        sheetsExported: 0,
        conversionRate: 0,
        leadsByDay: {},
      };

      let totalScore = 0;
      let scoredLeads = 0;

      leads.forEach(lead => {
        // Count by status
        analytics.leadsByStatus[lead.aiProcessingStatus] = 
          (analytics.leadsByStatus[lead.aiProcessingStatus] || 0) + 1;

        // Count by quality
        if (lead.leadQuality) {
          analytics.leadsByQuality[lead.leadQuality] = 
            (analytics.leadsByQuality[lead.leadQuality] || 0) + 1;
        }

        // Calculate average score
        if (lead.leadScore) {
          totalScore += lead.leadScore;
          scoredLeads++;
        }

        // Count emails sent
        if (lead.emailSent) {
          analytics.emailsSent++;
        }

        // Count sheets exported
        if (lead.googleSheetsExported) {
          analytics.sheetsExported++;
        }

        // Sum conversion values
        if (lead.conversionValue) {
          analytics.totalConversionValue += lead.conversionValue;
        }

        // Group by day
        const day = new Date(lead.createdAt).toISOString().split('T')[0];
        analytics.leadsByDay[day] = (analytics.leadsByDay[day] || 0) + 1;
      });

      // Calculate averages
      analytics.averageLeadScore = scoredLeads > 0 ? totalScore / scoredLeads : 0;
      analytics.conversionRate = totalLeads > 0 ? (analytics.emailsSent / totalLeads) * 100 : 0;

      return analytics;
    } catch (error) {
      strapi.log.error('Error calculating campaign analytics:', error);
      throw error;
    }
  },

  /**
   * Duplicate campaign
   * @param {number} campaignId - Campaign ID to duplicate
   * @param {Object} overrides - Fields to override
   * @returns {Object} New campaign
   */
  async duplicateCampaign(campaignId, overrides = {}) {
    try {
      const originalCampaign = await strapi.entityService.findOne('api::campaign.campaign', campaignId);
      
      if (!originalCampaign) {
        throw new Error('Campaign not found');
      }

      // Create new campaign data
      const newCampaignData = {
        ...originalCampaign,
        ...overrides,
        id: undefined, // Remove ID to create new
        slug: overrides.slug || `${originalCampaign.slug}-copy`,
        title: overrides.title || `${originalCampaign.title} (Copy)`,
        currentLeadCount: 0,
        createdAt: undefined,
        updatedAt: undefined,
        createdBy: undefined,
        updatedBy: undefined,
      };

      const newCampaign = await strapi.entityService.create('api::campaign.campaign', {
        data: newCampaignData,
      });

      strapi.log.info(`Campaign duplicated: ${campaignId} -> ${newCampaign.id}`);

      return newCampaign;
    } catch (error) {
      strapi.log.error('Error duplicating campaign:', error);
      throw error;
    }
  },

  /**
   * Archive campaign
   * @param {number} campaignId - Campaign ID
   * @returns {Object} Archived campaign
   */
  async archiveCampaign(campaignId) {
    try {
      const archivedCampaign = await strapi.entityService.update('api::campaign.campaign', campaignId, {
        data: {
          isActive: false,
          isPublic: false,
        },
      });

      strapi.log.info(`Campaign archived: ${campaignId}`);

      return archivedCampaign;
    } catch (error) {
      strapi.log.error('Error archiving campaign:', error);
      throw error;
    }
  },

}));