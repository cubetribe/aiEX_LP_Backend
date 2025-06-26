/**
 * Campaign Processing Service Registration
 * Registers the Campaign Processing Service as a Strapi service
 */

'use strict';

const { CampaignProcessingService } = require('../../../services/ai/campaign-processing');

module.exports = ({ strapi }) => {
  // Create singleton instance of Campaign Processing Service
  const campaignProcessingService = new CampaignProcessingService(strapi);

  return {
    /**
     * Initialize the campaign processing service
     */
    async initialize() {
      return await campaignProcessingService.initialize();
    },

    /**
     * Process a lead through the AI pipeline
     */
    async processLead(leadId, options = {}) {
      return await campaignProcessingService.processLead(leadId, options);
    },

    /**
     * Get service status
     */
    getStatus() {
      return campaignProcessingService.getStatus();
    },

    /**
     * Reset metrics
     */
    resetMetrics() {
      return campaignProcessingService.resetMetrics();
    },

    /**
     * Get direct access to service instance
     */
    getInstance() {
      return campaignProcessingService;
    },
  };
};