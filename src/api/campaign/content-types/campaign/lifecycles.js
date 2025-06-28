'use strict';

/**
 * Campaign lifecycle hooks
 * Auto-generate preview URLs, validate config JSON, and handle campaign updates
 */

const { validateCampaignConfig, validateResultDisplayConfig } = require('../../../../utils/campaign-schemas');
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'https://aiex-quiz-platform-519nmqcf0-cubetribes-projects.vercel.app';

module.exports = {
  // Before creating a campaign
  async beforeCreate(event) {
    const { data } = event.params;
    
    // VALIDATE CONFIG JSON - Prevent invalid configurations
    if (data.config && data.campaignType) {
      const validation = validateCampaignConfig(data.config, data.campaignType);
      
      if (!validation.success) {
        const errorMessages = validation.errors.map(err => `${err.path}: ${err.message}`).join('; ');
        const error = new Error(`Campaign configuration validation failed: ${errorMessages}`);
        error.details = validation.errors;
        throw error;
      }
      
      // Use validated config (with defaults applied)
      data.config = validation.data;
      strapi.log.info(`✅ Campaign config validated for type: ${data.campaignType}`);
    }
    
    // VALIDATE RESULT DISPLAY CONFIG
    if (data.resultDisplayConfig) {
      const resultValidation = validateResultDisplayConfig(data.resultDisplayConfig);
      
      if (!resultValidation.success) {
        const errorMessages = resultValidation.errors.map(err => `${err.path}: ${err.message}`).join('; ');
        const error = new Error(`Result display configuration validation failed: ${errorMessages}`);
        error.details = resultValidation.errors;
        throw error;
      }
      
      // Use validated config
      data.resultDisplayConfig = resultValidation.data;
      strapi.log.info(`✅ Result display config validated`);
    }
    
    // Generate preview URL if slug is available
    if (data.slug) {
      data.previewUrl = `${FRONTEND_BASE_URL}/campaign/${data.slug}`;
      strapi.log.info(`Generated preview URL for new campaign: ${data.previewUrl}`);
    }
  },

  // Before updating a campaign
  async beforeUpdate(event) {
    const { data } = event.params;
    
    // Get existing campaign to check type
    const existingCampaign = await strapi.entityService.findOne(
      'api::campaign.campaign',
      event.params.where.id
    );
    
    if (!existingCampaign) {
      throw new Error('Campaign not found for update');
    }
    
    // Use existing type if not provided in update
    const campaignType = data.campaignType || existingCampaign.campaignType;
    
    // VALIDATE CONFIG JSON ON UPDATE
    if (data.config) {
      const validation = validateCampaignConfig(data.config, campaignType);
      
      if (!validation.success) {
        const errorMessages = validation.errors.map(err => `${err.path}: ${err.message}`).join('; ');
        const error = new Error(`Campaign configuration validation failed: ${errorMessages}`);
        error.details = validation.errors;
        throw error;
      }
      
      // Use validated config
      data.config = validation.data;
      strapi.log.info(`✅ Campaign config validated for update: ${campaignType}`);
    }
    
    // VALIDATE RESULT DISPLAY CONFIG ON UPDATE
    if (data.resultDisplayConfig) {
      const resultValidation = validateResultDisplayConfig(data.resultDisplayConfig);
      
      if (!resultValidation.success) {
        const errorMessages = resultValidation.errors.map(err => `${err.path}: ${err.message}`).join('; ');
        const error = new Error(`Result display configuration validation failed: ${errorMessages}`);
        error.details = resultValidation.errors;
        throw error;
      }
      
      // Use validated config
      data.resultDisplayConfig = resultValidation.data;
      strapi.log.info(`✅ Result display config validated for update`);
    }
    
    // Update preview URL if slug changes
    if (data.slug) {
      data.previewUrl = `${FRONTEND_BASE_URL}/campaign/${data.slug}`;
      strapi.log.info(`Updated preview URL for campaign: ${data.previewUrl}`);
    }
  },

  // After creating a campaign
  async afterCreate(event) {
    const { result } = event;
    strapi.log.info(`Campaign created: ${result.title} (${result.slug})`);
    
    // Log AI model configuration
    if (result.aiModel) {
      strapi.log.info(`AI Model configured: ${result.aiModel} with provider ${result.aiProvider}`);
    }
  },

  // After updating a campaign
  async afterUpdate(event) {
    const { result } = event;
    strapi.log.info(`Campaign updated: ${result.title} (${result.slug})`);
    
    // Validate AI model matches provider
    if (result.aiModel && result.aiProvider !== 'auto') {
      const modelProviderMap = {
        'gpt-4.5': 'chatgpt',
        'gpt-4.1': 'chatgpt',
        'gpt-4o': 'chatgpt',
        'gpt-4o-mini': 'chatgpt', 
        'gpt-4-turbo': 'chatgpt',
        'gpt-3.5-turbo': 'chatgpt',
        'claude-opus-3.7': 'anthropic',
        'claude-sonnet-3.7': 'anthropic',
        'gemini-2.5-pro': 'gemini',
        'gemini-2.5-flash': 'gemini'
      };
      
      const expectedProvider = modelProviderMap[result.aiModel];
      if (expectedProvider && expectedProvider !== result.aiProvider) {
        strapi.log.warn(`AI Model/Provider mismatch: ${result.aiModel} expects provider '${expectedProvider}', but '${result.aiProvider}' is selected`);
      }
    }
  }
};