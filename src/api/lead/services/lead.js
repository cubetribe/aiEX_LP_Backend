'use strict';

/**
 * Lead Service
 * Business logic for lead management
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::lead.lead', ({ strapi }) => ({
  /**
   * Calculate lead score based on responses
   */
  calculateLeadScore(responses) {
    // Basic scoring algorithm - can be enhanced later
    let score = 0;
    
    if (responses && typeof responses === 'object') {
      const responseCount = Object.keys(responses).length;
      score = Math.min(responseCount * 10, 100); // 10 points per response, max 100
    }
    
    return score;
  },

  /**
   * Determine lead quality based on score
   */
  calculateLeadQuality(score) {
    if (score >= 80) return 'hot';
    if (score >= 60) return 'warm';
    if (score >= 30) return 'cold';
    return 'unqualified';
  },

  /**
   * Process lead submission
   */
  async processLeadSubmission(data) {
    try {
      // Calculate score and quality
      const leadScore = this.calculateLeadScore(data.responses);
      const leadQuality = this.calculateLeadQuality(leadScore);

      // Create lead with calculated values
      const lead = await strapi.entityService.create('api::lead.lead', {
        data: {
          ...data,
          leadScore,
          leadQuality,
          responses: data.responses || {}
        },
        populate: ['campaign']
      });

      strapi.log.info(`Lead created: ${lead.email} (Score: ${leadScore}, Quality: ${leadQuality})`);
      
      return lead;
    } catch (error) {
      strapi.log.error('Error processing lead submission:', error);
      throw error;
    }
  },

  /**
   * Get leads by campaign
   */
  async getLeadsByCampaign(campaignId, options = {}) {
    try {
      const leads = await strapi.entityService.findMany('api::lead.lead', {
        filters: {
          campaign: {
            id: campaignId
          }
        },
        populate: ['campaign'],
        ...options
      });

      return leads;
    } catch (error) {
      strapi.log.error('Error fetching leads by campaign:', error);
      throw error;
    }
  },

  /**
   * Get lead statistics
   */
  async getLeadStats(campaignId = null) {
    try {
      const filters = campaignId ? { campaign: { id: campaignId } } : {};
      
      const [total, hot, warm, cold, unqualified] = await Promise.all([
        strapi.entityService.count('api::lead.lead', { filters }),
        strapi.entityService.count('api::lead.lead', { 
          filters: { ...filters, leadQuality: 'hot' }
        }),
        strapi.entityService.count('api::lead.lead', { 
          filters: { ...filters, leadQuality: 'warm' }
        }),
        strapi.entityService.count('api::lead.lead', { 
          filters: { ...filters, leadQuality: 'cold' }
        }),
        strapi.entityService.count('api::lead.lead', { 
          filters: { ...filters, leadQuality: 'unqualified' }
        })
      ]);

      return {
        total,
        byQuality: { hot, warm, cold, unqualified },
        averageScore: await this.getAverageScore(filters)
      };
    } catch (error) {
      strapi.log.error('Error calculating lead stats:', error);
      throw error;
    }
  },

  /**
   * Get average lead score
   */
  async getAverageScore(filters = {}) {
    try {
      const leads = await strapi.entityService.findMany('api::lead.lead', {
        filters,
        fields: ['leadScore']
      });

      if (leads.length === 0) return 0;
      
      const totalScore = leads.reduce((sum, lead) => sum + (lead.leadScore || 0), 0);
      return Math.round(totalScore / leads.length);
    } catch (error) {
      strapi.log.error('Error calculating average score:', error);
      return 0;
    }
  }
}));