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
   * Enhanced process lead submission with conditional scoring
   */
  async processLeadSubmission(data) {
    try {
      // Get campaign for conditional scoring
      const campaignData = await strapi.entityService.findOne('api::campaign.campaign', data.campaign, {
        fields: ['config', 'jsonCode']
      });

      // Calculate score and quality with campaign logic
      const { leadScore, leadQuality } = this.calculateEnhancedScore(data.responses, campaignData);

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
   * Enhanced scoring with conditional logic
   */
  calculateEnhancedScore(responses, campaignData) {
    if (!responses || Object.keys(responses).length === 0) {
      return { leadScore: 30, leadQuality: 'cold' };
    }

    let config = campaignData?.config || {};
    
    // Merge jsonCode if present (for bot-generated configs)
    if (campaignData?.jsonCode && campaignData.jsonCode.trim()) {
      try {
        const jsonConfig = JSON.parse(campaignData.jsonCode);
        config = { ...config, ...jsonConfig };
      } catch (error) {
        strapi.log.error('Invalid JSON in campaign jsonCode:', error);
      }
    }

    // Use conditional scoring if defined
    if (config.scoring?.logic === 'conditional') {
      return this.calculateConditionalScore(responses, config.scoring);
    }

    // Fall back to intelligent default scoring
    return this.calculateIntelligentScore(responses);
  },

  /**
   * Conditional scoring based on campaign rules
   */
  calculateConditionalScore(responses, scoringConfig) {
    const rules = scoringConfig.rules || [];
    const defaultRule = scoringConfig.default || { leadScore: 50, leadQuality: 'warm' };

    // Check each rule in order
    for (const rule of rules) {
      if (this.matchesCondition(responses, rule.if)) {
        return rule.then;
      }
    }

    return defaultRule;
  },

  /**
   * Check if responses match a condition
   */
  matchesCondition(responses, conditions) {
    return Object.entries(conditions).every(([field, expectedValue]) => {
      const userValue = responses[field];
      
      if (Array.isArray(expectedValue)) {
        return expectedValue.includes(userValue);
      }
      
      return userValue === expectedValue;
    });
  },

  /**
   * Intelligent scoring for Privat vs. Gewerblich
   */
  calculateIntelligentScore(responses) {
    let score = 50; // Base score

    const responseCount = Object.keys(responses).length;
    score += responseCount * 8; // +8 per question answered

    const responseValues = Object.values(responses).join(' ').toLowerCase();
    
    // Business scoring (higher scores)
    if (responseValues.includes('unternehmer') || responseValues.includes('business')) {
      score += 25;
      
      if (responseValues.includes('200+') || responseValues.includes('über 200')) {
        score += 35; // Large enterprise = hot lead
      } else if (responseValues.includes('51-200')) {
        score += 25; // Medium enterprise = warm lead  
      } else if (responseValues.includes('11-50')) {
        score += 15; // Small business = warm lead
      } else if (responseValues.includes('1-10')) {
        score += 10; // Micro business = cold lead
      }
    }

    // Private person scoring (moderate scores)
    if (responseValues.includes('privatperson') || responseValues.includes('private')) {
      score += 10;
      
      if (responseValues.includes('über 100k') || responseValues.includes('100k+')) {
        score += 20; // High income private = warm lead
      } else if (responseValues.includes('60k-100k')) {
        score += 15; // Good income = cold lead
      } else if (responseValues.includes('30k-60k')) {
        score += 10; // Average income = cold lead
      }
    }

    // Bonus for engagement indicators
    if (responseValues.includes('innovation') || responseValues.includes('growth')) {
      score += 10;
    }

    // Ensure score bounds
    score = Math.min(100, Math.max(0, score));

    // Determine quality
    let leadQuality;
    if (score >= 80) {
      leadQuality = 'hot';
    } else if (score >= 60) {
      leadQuality = 'warm';
    } else if (score >= 40) {
      leadQuality = 'cold';
    } else {
      leadQuality = 'unqualified';
    }

    return { leadScore: score, leadQuality };
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