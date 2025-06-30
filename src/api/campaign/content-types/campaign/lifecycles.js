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
        error.statusCode = 400;
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
    try {
      const { data } = event.params;
      
      // Enhanced logging for debugging admin panel issues
      strapi.log.info('📝 Campaign update event:', {
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : [],
        hasConfig: !!data?.config,
        configKeys: data?.config ? Object.keys(data.config) : [],
        configType: data?.config ? typeof data.config : 'undefined',
        hasResultDisplayConfig: !!data?.resultDisplayConfig,
        whereClause: event.params.where,
        // Log the actual config being sent (truncated if too large)
        configSample: data?.config ? JSON.stringify(data.config).substring(0, 500) : 'none',
        fullDataKeys: data ? Object.keys(data) : [],
        // Log if this is from admin panel (detectable patterns)
        isAdminPanel: data && !data.campaignType && data.config && typeof data.config === 'object'
      });
      
      // Skip validation if no data or config changes
      if (!data || (!data.config && !data.resultDisplayConfig)) {
        return;
      }
      
      // Detect admin panel updates - they typically don't send campaignType
      const isAdminPanelUpdate = data && !data.campaignType && !data.slug && data.config;
      
      if (isAdminPanelUpdate) {
        strapi.log.info('📝 Admin panel update detected - applying enhanced validation logic');
      }
      
      // The improved validation logic will handle partial updates properly
    
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
        // A partial update is when we're not updating the core structure (type, title, questions)
        const configKeys = Object.keys(data.config);
        const coreKeys = ['type', 'title', 'questions'];
        const hasCoreKeys = coreKeys.some(key => configKeys.includes(key));
        const isPartialUpdate = !hasCoreKeys && configKeys.length > 0;
        
        if (isPartialUpdate) {
          // For partial updates, validate with the isPartialUpdate flag
          const validation = validateCampaignConfig(data.config, campaignType, true);
          
          if (validation.isPartialUpdate) {
            // It's a nested-only update, apply directly
            strapi.log.info('✅ Nested-only update validated, applying directly');
            // Merge with existing config
            const mergedConfig = { ...existingCampaign.config, ...data.config };
            data.config = mergedConfig;
          } else {
            // It's a partial update that affects core fields, need to merge and validate
            const deepMerge = (target, source) => {
              const output = { ...target };
              for (const key in source) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                  output[key] = deepMerge(target[key] || {}, source[key]);
                } else {
                  output[key] = source[key];
                }
              }
              return output;
            };
            
            // Deep merge the configs
            const mergedConfig = deepMerge(existingCampaign.config || {}, data.config);
            
            strapi.log.info('📋 Handling partial update with core fields, merged config:', {
              campaignType,
              hasQuestions: !!mergedConfig.questions,
              questionsCount: mergedConfig.questions?.length || 0,
              updateKeys: Object.keys(data.config),
              isPartialUpdate: true
            });
            
            // Validate the merged config
            const mergedValidation = validateCampaignConfig(mergedConfig, campaignType);
            
            if (!mergedValidation.success) {
              const errorMessages = mergedValidation.errors.map(err => `${err.path}: ${err.message}`).join('; ');
              strapi.log.error('❌ Campaign validation failed:', {
                errors: mergedValidation.errors,
                mergedConfig
              });
              const error = new Error(`Campaign configuration validation failed: ${errorMessages}`);
              error.details = mergedValidation.errors;
              throw error;
            }
            
            // Use validated merged config
            data.config = mergedValidation.data;
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
    
    } catch (error) {
      // Log the error with full details
      strapi.log.error('❌ Error in campaign beforeUpdate lifecycle:', {
        error: error.message,
        stack: error.stack,
        details: error.details,
        data: event.params.data
      });
      
      // Re-throw with a more user-friendly message
      if (error.message.includes('validation failed')) {
        // For validation errors, provide clearer feedback
        const userError = new Error(`Campaign configuration error: ${error.message}`);
        userError.details = error.details || {};
        userError.statusCode = 400;
        throw userError;
      } else {
        // For other errors, log and re-throw
        const userError = new Error(`Campaign update failed: ${error.message}`);
        userError.details = error.details || {};
        userError.statusCode = 500;
        throw userError;
      }
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