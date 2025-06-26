/**
 * Lead Service
 * Business logic for lead management and processing
 */

'use strict';

const { createCoreService } = require('@strapi/strapi').factories;

/**
 * Lead service with custom business logic
 */
module.exports = createCoreService('api::lead.lead', ({ strapi }) => ({

  /**
   * Create lead with validation and processing
   * @param {Object} leadData - Lead data
   * @returns {Object} Created lead
   */
  async createLeadWithProcessing(leadData) {
    try {
      // Validate campaign
      const campaign = await strapi.entityService.findOne('api::campaign.campaign', leadData.campaign);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (!campaign.isActive) {
        throw new Error('Campaign is not active');
      }

      // Check campaign constraints
      if (campaign.maxLeads && campaign.currentLeadCount >= campaign.maxLeads) {
        throw new Error('Campaign has reached maximum lead capacity');
      }

      // Calculate lead score based on responses
      const leadScore = this.calculateLeadScore(leadData.responses, campaign.config);
      
      // Determine lead quality
      const leadQuality = this.determineLeadQuality(leadScore, leadData.responses);

      // Create lead
      const lead = await strapi.entityService.create('api::lead.lead', {
        data: {
          ...leadData,
          leadScore,
          leadQuality,
          consentTimestamp: new Date(),
        },
      });

      // Update campaign lead count
      await strapi.entityService.update('api::campaign.campaign', campaign.id, {
        data: {
          currentLeadCount: campaign.currentLeadCount + 1,
        },
      });

      strapi.log.info(`New lead created: ${lead.id} for campaign: ${campaign.slug}`);

      return lead;
    } catch (error) {
      strapi.log.error('Error creating lead with processing:', error);
      throw error;
    }
  },

  /**
   * Calculate lead score based on responses
   * @param {Object} responses - Lead responses
   * @param {Object} campaignConfig - Campaign configuration
   * @returns {number} Lead score (0-100)
   */
  calculateLeadScore(responses, campaignConfig) {
    try {
      let score = 50; // Base score

      // Score based on campaign type
      if (campaignConfig.type === 'quiz' && campaignConfig.scoring) {
        score = this.calculateQuizScore(responses, campaignConfig.scoring);
      } else {
        // Generic scoring based on response completeness
        const responseCount = Object.keys(responses).length;
        const completeness = Math.min(responseCount / 5, 1); // Assume 5 ideal responses
        score = Math.round(50 + (completeness * 30)); // 50-80 based on completeness
      }

      // Adjust score based on response quality
      score = this.adjustScoreForQuality(score, responses);

      return Math.max(0, Math.min(100, score));
    } catch (error) {
      strapi.log.error('Error calculating lead score:', error);
      return 50; // Default score
    }
  },

  /**
   * Calculate quiz-specific score
   * @param {Object} responses - Quiz responses
   * @param {Object} scoring - Scoring configuration
   * @returns {number} Quiz score
   */
  calculateQuizScore(responses, scoring) {
    if (scoring.logic === 'weighted') {
      let totalScore = 0;
      let maxScore = 0;

      Object.entries(responses).forEach(([questionId, answer]) => {
        const weight = scoring.weights[answer] || 0;
        totalScore += weight;
        maxScore += Math.max(...Object.values(scoring.weights));
      });

      return Math.round((totalScore / maxScore) * 100);
    }

    return 50; // Default score if no scoring logic
  },

  /**
   * Adjust score based on response quality indicators
   * @param {number} baseScore - Base score
   * @param {Object} responses - Lead responses
   * @returns {number} Adjusted score
   */
  adjustScoreForQuality(baseScore, responses) {
    let adjustment = 0;

    // Check for quality indicators
    Object.values(responses).forEach(response => {
      if (typeof response === 'string') {
        // Length indicates engagement
        if (response.length > 100) adjustment += 5;
        else if (response.length > 50) adjustment += 2;

        // Specific keywords that indicate high intent
        const highIntentKeywords = ['urgent', 'immediately', 'asap', 'budget', 'buy', 'purchase'];
        const hasHighIntent = highIntentKeywords.some(keyword => 
          response.toLowerCase().includes(keyword)
        );
        if (hasHighIntent) adjustment += 10;
      }
    });

    return baseScore + adjustment;
  },

  /**
   * Determine lead quality based on score and responses
   * @param {number} score - Lead score
   * @param {Object} responses - Lead responses
   * @returns {string} Lead quality ('hot', 'warm', 'cold', 'unqualified')
   */
  determineLeadQuality(score, responses) {
    if (score >= 80) return 'hot';
    if (score >= 60) return 'warm';
    if (score >= 40) return 'cold';
    return 'unqualified';
  },

  /**
   * Process lead with AI
   * @param {number} leadId - Lead ID
   * @returns {Object} Processing result
   */
  async processLeadWithAI(leadId) {
    try {
      const lead = await strapi.entityService.findOne('api::lead.lead', leadId, {
        populate: ['campaign'],
      });

      if (!lead) {
        throw new Error('Lead not found');
      }

      if (!lead.campaign) {
        throw new Error('Campaign not found for lead');
      }

      // Update processing status
      await strapi.entityService.update('api::lead.lead', leadId, {
        data: {
          aiProcessingStatus: 'processing',
        },
      });

      // Get AI orchestrator service
      const aiService = strapi.service('api::ai-orchestrator.ai-orchestrator');
      
      // Process with AI
      const aiResult = await aiService.processLead(lead, lead.campaign);

      // Update lead with AI result
      const updatedLead = await strapi.entityService.update('api::lead.lead', leadId, {
        data: {
          aiResult: aiResult.content,
          aiProcessingStatus: 'completed',
          aiProvider: aiResult.provider,
          aiModel: aiResult.model,
          aiTokensUsed: aiResult.tokensUsed,
          aiProcessingTime: aiResult.processingTime,
          aiCost: aiResult.cost,
        },
      });

      strapi.log.info(`Lead processed with AI: ${leadId}`);

      return {
        success: true,
        lead: updatedLead,
        aiResult: aiResult.content,
      };

    } catch (error) {
      strapi.log.error('Error processing lead with AI:', error);

      // Update lead with error status
      await strapi.entityService.update('api::lead.lead', leadId, {
        data: {
          aiProcessingStatus: 'failed',
          processingErrors: [
            ...(lead.processingErrors || []),
            {
              timestamp: new Date(),
              error: error.message,
              stack: error.stack,
            },
          ],
          retryCount: (lead.retryCount || 0) + 1,
        },
      });

      throw error;
    }
  },

  /**
   * Retry failed lead processing
   * @param {number} leadId - Lead ID
   * @returns {Object} Retry result
   */
  async retryLeadProcessing(leadId) {
    try {
      const lead = await strapi.entityService.findOne('api::lead.lead', leadId);

      if (!lead) {
        throw new Error('Lead not found');
      }

      if (lead.retryCount >= lead.maxRetries) {
        throw new Error('Maximum retry attempts reached');
      }

      // Reset processing status
      await strapi.entityService.update('api::lead.lead', leadId, {
        data: {
          aiProcessingStatus: 'pending',
        },
      });

      // Queue processing job
      const queueService = strapi.service('api::queue.queue');
      await queueService.addAIProcessingJob({
        leadId: leadId,
        campaignId: lead.campaign,
        priority: 'high',
        retry: true,
      });

      strapi.log.info(`Lead processing retry queued: ${leadId}`);

      return {
        success: true,
        message: 'Lead processing retry queued',
        retryCount: lead.retryCount + 1,
      };

    } catch (error) {
      strapi.log.error('Error retrying lead processing:', error);
      throw error;
    }
  },

  /**
   * Get lead statistics
   * @param {Object} filters - Filters for statistics
   * @returns {Object} Lead statistics
   */
  async getLeadStatistics(filters = {}) {
    try {
      const baseQuery = {
        filters: filters,
      };

      // Get total counts
      const totalLeads = await strapi.db.query('api::lead.lead').count(baseQuery);

      // Get leads by processing status
      const leadsByStatus = await strapi.db.query('api::lead.lead').findMany({
        ...baseQuery,
        select: ['aiProcessingStatus'],
        groupBy: ['aiProcessingStatus'],
      });

      // Get leads by quality
      const leadsByQuality = await strapi.db.query('api::lead.lead').findMany({
        ...baseQuery,
        select: ['leadQuality'],
        groupBy: ['leadQuality'],
      });

      // Get recent leads
      const recentLeads = await strapi.db.query('api::lead.lead').findMany({
        ...baseQuery,
        select: ['id', 'firstName', 'email', 'leadScore', 'leadQuality', 'createdAt'],
        orderBy: { createdAt: 'desc' },
        limit: 10,
      });

      // Calculate average lead score
      const avgScoreResult = await strapi.db.query('api::lead.lead').findMany({
        ...baseQuery,
        select: ['leadScore'],
      });

      const averageLeadScore = avgScoreResult.length > 0 
        ? avgScoreResult.reduce((sum, lead) => sum + (lead.leadScore || 0), 0) / avgScoreResult.length
        : 0;

      const statistics = {
        totalLeads,
        averageLeadScore: Math.round(averageLeadScore * 100) / 100,
        leadsByStatus: leadsByStatus.reduce((acc, curr) => {
          acc[curr.aiProcessingStatus] = curr.count || 1;
          return acc;
        }, {}),
        leadsByQuality: leadsByQuality.reduce((acc, curr) => {
          acc[curr.leadQuality] = curr.count || 1;
          return acc;
        }, {}),
        recentLeads,
      };

      return statistics;

    } catch (error) {
      strapi.log.error('Error getting lead statistics:', error);
      throw error;
    }
  },

  /**
   * Export leads to CSV
   * @param {Object} filters - Export filters
   * @returns {string} CSV data
   */
  async exportLeadsToCSV(filters = {}) {
    try {
      const leads = await strapi.entityService.findMany('api::lead.lead', {
        filters,
        populate: {
          campaign: {
            select: ['slug', 'title'],
          },
        },
      });

      const csvHeaders = [
        'ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Job Title',
        'Lead Score', 'Lead Quality', 'Processing Status', 'Email Sent', 'Sheets Exported',
        'Campaign', 'Created At', 'Updated At'
      ];

      const csvRows = leads.map(lead => [
        lead.id,
        lead.firstName || '',
        lead.lastName || '',
        lead.email || '',
        lead.phone || '',
        lead.company || '',
        lead.jobTitle || '',
        lead.leadScore || 0,
        lead.leadQuality || '',
        lead.aiProcessingStatus || '',
        lead.emailSent ? 'Yes' : 'No',
        lead.googleSheetsExported ? 'Yes' : 'No',
        lead.campaign ? lead.campaign.title : '',
        lead.createdAt || '',
        lead.updatedAt || '',
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      return csvContent;

    } catch (error) {
      strapi.log.error('Error exporting leads to CSV:', error);
      throw error;
    }
  },

}));