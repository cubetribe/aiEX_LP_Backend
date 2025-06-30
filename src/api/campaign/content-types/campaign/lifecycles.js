'use strict';

/**
 * Campaign lifecycle hooks
 * Auto-generate preview URLs, validate config JSON, and handle campaign updates
 */

const { validateCampaignConfig, validateResultDisplayConfig } = require('../../../../utils/campaign-schemas');
const { ApplicationError } = require('@strapi/utils').errors;
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
        throw new ApplicationError(`Campaign configuration validation failed: ${errorMessages}`, {
          details: validation.errors
        });
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
        throw new ApplicationError(`Result display configuration validation failed: ${errorMessages}`, {
          details: resultValidation.errors
        });
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
    try {
      const { data } = event.params;
      
      // Skip validation if no data
      if (!data) {
        return;
      }
      
      // Log update info for debugging
      strapi.log.info('📝 Campaign update:', {
        hasConfig: !!data.config,
        hasJsonCode: !!data.jsonCode,
        hasResultDisplayConfig: !!data.resultDisplayConfig,
        campaignId: event.params.where?.id || event.params.where
      });
      
      // Skip validation if no config-related changes
      if (!data.config && !data.jsonCode && !data.resultDisplayConfig) {
        return;
      }
      
      // Handle config if it comes as a string (shouldn't happen but just in case)
      if (data.config && typeof data.config === 'string') {
        try {
          data.config = JSON.parse(data.config);
          strapi.log.info('📝 Parsed config from string to object');
        } catch (e) {
          strapi.log.error('❌ Failed to parse config string:', e);
          throw new ApplicationError('Invalid config format - must be valid JSON');
        }
      }
      
      // Get campaign ID from where clause
      const campaignId = event.params.where?.id || event.params.where;
      
      if (!campaignId) {
        strapi.log.warn('No campaign ID found in update event, skipping validation');
        return;
      }
      
      // Get existing campaign to check type
      const existingCampaign = await strapi.entityService.findOne(
        'api::campaign.campaign',
        campaignId
      );
      
      if (!existingCampaign) {
        strapi.log.warn(`Campaign ${campaignId} not found for update, skipping validation`);
        return;
      }
      
      // Use existing type if not provided in update
      const campaignType = data.campaignType || existingCampaign.campaignType;
      
      // VALIDATE CONFIG JSON ON UPDATE
      if (data.config && typeof data.config === 'object') {
        const validation = validateCampaignConfig(data.config, campaignType);
        
        if (!validation.success) {
          const errorMessages = validation.errors.map(err => `${err.path}: ${err.message}`).join('; ');
          strapi.log.error('❌ Campaign validation failed:', {
            errors: validation.errors,
            config: data.config
          });
          throw new ApplicationError(`Campaign configuration validation failed: ${errorMessages}`, {
            details: validation.errors
          });
        }
        
        // Use validated config (with defaults applied)
        data.config = validation.data;
        strapi.log.info(`✅ Campaign config validated for type: ${campaignType}`);
      }
      
      // VALIDATE RESULT DISPLAY CONFIG ON UPDATE
      if (data.resultDisplayConfig) {
        const resultValidation = validateResultDisplayConfig(data.resultDisplayConfig);
        
        if (!resultValidation.success) {
          const errorMessages = resultValidation.errors.map(err => `${err.path}: ${err.message}`).join('; ');
          throw new ApplicationError(`Result display configuration validation failed: ${errorMessages}`, {
            details: resultValidation.errors
          });
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
      
    } catch (error) {
      // Log the error with full details
      strapi.log.error('❌ Error in campaign beforeUpdate lifecycle:', {
        error: error.message,
        stack: error.stack,
        details: error.details,
        data: event.params.data
      });
      
      // Re-throw as ApplicationError for proper admin panel display
      if (error instanceof ApplicationError) {
        throw error; // Already an ApplicationError, just re-throw
      }
      
      throw new ApplicationError(`Campaign update failed: ${error.message}`, {
        details: error.details || {}
      });
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
    if (result.aiModel && result.aiProvider && result.aiProvider !== 'auto') {
      const modelProviderMap = {
        'gpt-4o': 'openai',
        'gpt-4o-mini': 'openai', 
        'gpt-4-turbo': 'openai',
        'gpt-3.5-turbo': 'openai',
        'claude-3-opus': 'anthropic',
        'claude-3-sonnet': 'anthropic',
        'claude-3-haiku': 'anthropic',
        'gemini-1.5-pro': 'gemini',
        'gemini-1.5-flash': 'gemini'
      };
      
      const expectedProvider = modelProviderMap[result.aiModel];
      if (expectedProvider && expectedProvider !== result.aiProvider) {
        strapi.log.warn(`AI Model/Provider mismatch: ${result.aiModel} expects provider '${expectedProvider}', but '${result.aiProvider}' is selected`);
      }
    }
  }
};