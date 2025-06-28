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
    
    // Log incoming update data for debugging
    strapi.log.info('📝 Campaign update event:', {
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
      hasConfig: !!data?.config,
      configKeys: data?.config ? Object.keys(data.config) : [],
      hasResultDisplayConfig: !!data?.resultDisplayConfig,
      whereClause: event.params.where,
      fullData: JSON.stringify(data, null, 2)
    });
    
    // Skip validation if no data or config changes
    if (!data || (!data.config && !data.resultDisplayConfig)) {
      return;
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
    if (data.config !== undefined) {
      // If config is null, skip validation (allows clearing config)
      if (data.config === null) {
        strapi.log.info('Config set to null, skipping validation');
        return;
      }
      
      // If config is being updated
      if (data.config && typeof data.config === 'object') {
        // Check if this is a partial update (admin panel typically sends partial updates)
        const isPartialUpdate = !data.config.type && !data.config.title && !data.config.questions;
        
        if (isPartialUpdate && existingCampaign.config) {
          // For partial updates, merge with existing config
          const mergedConfig = {
            ...(existingCampaign.config || {}),
            ...data.config
          };
          
          strapi.log.info('📋 Handling partial update, merged config:', {
            campaignType,
            hasTitle: !!mergedConfig.title,
            hasQuestions: !!mergedConfig.questions,
            questionsCount: mergedConfig.questions?.length || 0,
            updateKeys: Object.keys(data.config),
            isPartialUpdate: true
          });
          
          // Only validate if we have a complete config structure
          if (mergedConfig.title || mergedConfig.questions) {
            const validation = validateCampaignConfig(mergedConfig, campaignType);
            
            if (!validation.success) {
              const errorMessages = validation.errors.map(err => `${err.path}: ${err.message}`).join('; ');
              strapi.log.error('❌ Campaign validation failed:', {
                errors: validation.errors,
                mergedConfig
              });
              const error = new Error(`Campaign configuration validation failed: ${errorMessages}`);
              error.details = validation.errors;
              throw error;
            }
            
            // Use merged config to preserve all fields
            data.config = mergedConfig;
          } else {
            // If no title or questions in merged config, just apply the update without validation
            strapi.log.info('⚠️ Partial update without core fields, applying without validation');
          }
        } else {
          // Full config update - validate as normal
          strapi.log.info('📋 Full config update detected');
          
          const validation = validateCampaignConfig(data.config, campaignType);
          
          if (!validation.success) {
            const errorMessages = validation.errors.map(err => `${err.path}: ${err.message}`).join('; ');
            strapi.log.error('❌ Campaign validation failed:', {
              errors: validation.errors,
              config: data.config
            });
            const error = new Error(`Campaign configuration validation failed: ${errorMessages}`);
            error.details = validation.errors;
            throw error;
          }
          
          // Use validated config
          data.config = validation.data;
        }
        
        strapi.log.info(`✅ Campaign config processed for update: ${campaignType}`);
      }
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