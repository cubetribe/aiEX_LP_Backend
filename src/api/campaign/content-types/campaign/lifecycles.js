'use strict';

/**
 * Campaign lifecycle hooks
 * Auto-generate preview URLs, validate config JSON, and handle campaign updates
 */

const { validateCampaignConfig, validateResultDisplayConfig } = require('../../../../utils/campaign-schemas');
const { ApplicationError } = require('@strapi/utils').errors;
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'https://aiex-quiz-platform.vercel.app';

module.exports = {
  // Before creating a campaign
  async beforeCreate(event) {
    try {
      const { data } = event.params;
      
      // Log incoming data for debugging
      strapi.log.info('🆕 Campaign creation attempt:', {
        title: data.title,
        campaignType: data.campaignType,
        hasConfig: !!data.config,
        hasResultDisplayConfig: !!data.resultDisplayConfig,
        dataKeys: Object.keys(data)
      });
      
      // Ensure aiProvider is set to 'openai' (only available option)
      if (!data.aiProvider || data.aiProvider !== 'openai') {
        data.aiProvider = 'openai';
        strapi.log.info('✅ AI Provider set to openai');
      }
      
      // Ensure aiModel is set to 'gpt-4o' (only available option)
      if (!data.aiModel || data.aiModel !== 'gpt-4o') {
        data.aiModel = 'gpt-4o';
        strapi.log.info('✅ AI Model set to gpt-4o');
      }
      
      // Ensure config exists for new campaigns (with defaults)
      if (!data.config && data.campaignType) {
        data.config = {
          type: data.campaignType,
          questions: [],
          scoring: {
            logic: 'weighted',
            weights: {}
          },
          styling: {
            primaryColor: '#007bff',
            secondaryColor: '#6c757d'
          },
          behavior: {
            showProgress: true,
            allowBack: true,
            randomizeQuestions: false,
            conditionalLogic: false
          }
        };
        strapi.log.info('✅ Default config created for new campaign');
      }
      
      // Validate config but be lenient for new campaigns
      if (data.config && data.campaignType) {
        try {
          const validation = validateCampaignConfig(data.config, data.campaignType);
          
          if (!validation.success) {
            // Log the validation errors but don't throw for non-critical issues
            strapi.log.warn('Campaign config validation warnings:', validation.errors);
            
            // Only throw for critical errors (e.g., wrong type)
            const criticalErrors = validation.errors.filter(err => 
              err.path.includes('type') || err.path.includes('required')
            );
            
            if (criticalErrors.length > 0) {
              const errorMessages = criticalErrors.map(err => `${err.path}: ${err.message}`).join('; ');
              throw new ApplicationError(`Campaign configuration validation failed: ${errorMessages}`, {
                details: criticalErrors
              });
            }
          }
          
          // Use validated config (with defaults applied)
          data.config = validation.data;
          strapi.log.info(`✅ Campaign config validated for type: ${data.campaignType}`);
        } catch (error) {
          // If validation completely fails, just ensure type is set correctly
          strapi.log.warn('Campaign config validation error, applying minimal fixes:', error.message);
          if (typeof data.config === 'object') {
            data.config.type = data.campaignType;
          }
        }
      }
    
    // Skip result display config validation too - let Strapi handle it
    if (data.resultDisplayConfig) {
      strapi.log.info(`✅ Result display config provided`);
    }
    
    // Generate preview URL if slug is available
    if (data.slug) {
      data.previewUrl = `${FRONTEND_BASE_URL}/campaign/${data.slug}`;
      strapi.log.info(`Generated preview URL for new campaign: ${data.previewUrl}`);
    }
    
    strapi.log.info('✅ Campaign beforeCreate completed successfully');
    
    } catch (error) {
      strapi.log.error('❌ Error in campaign beforeCreate:', {
        error: error.message,
        stack: error.stack,
        data: event.params.data
      });
      
      // Re-throw as ApplicationError for proper admin panel display
      if (error instanceof ApplicationError) {
        throw error;
      }
      
      throw new ApplicationError(`Campaign creation failed: ${error.message}`, {
        details: error.details || {}
      });
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
      
      // Ensure aiProvider is set to 'openai' (only available option)
      if (data.aiProvider && data.aiProvider !== 'openai') {
        data.aiProvider = 'openai';
        strapi.log.info('✅ AI Provider set to openai on update');
      }
      
      // Ensure aiModel is set to 'gpt-4o' (only available option)
      if (data.aiModel && data.aiModel !== 'gpt-4o') {
        data.aiModel = 'gpt-4o';
        strapi.log.info('✅ AI Model set to gpt-4o on update');
      }
      
      // Log update info for debugging
      strapi.log.info('📝 Campaign update:', {
        hasConfig: !!data.config,
        hasJsonCode: !!data.jsonCode,
        hasResultDisplayConfig: !!data.resultDisplayConfig,
        campaignId: event.params.where?.id || event.params.where,
        updateKeys: Object.keys(data),
        isPartialUpdate: !data.type && !data.title && !data.questions
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
      
      // Check if this is a partial update from admin panel
      const isPartialUpdate = !data.config?.type && !data.config?.questions && existingCampaign.config;
      
      if (isPartialUpdate && data.config) {
        strapi.log.info('📝 Detected partial config update from admin panel');
        // Merge with existing config to preserve structure
        data.config = {
          ...existingCampaign.config,
          ...data.config
        };
        strapi.log.info('📝 Merged config:', JSON.stringify(data.config, null, 2));
      }
      
      // VALIDATE CONFIG JSON ON UPDATE - be lenient
      if (data.config && typeof data.config === 'object') {
        try {
          // Skip validation for partial updates with incomplete configs
          if (isPartialUpdate || !data.config.type) {
            strapi.log.info('📝 Skipping validation for partial update');
            // Just ensure type is set
            if (!data.config.type) {
              data.config.type = campaignType;
            }
          } else {
            const validation = validateCampaignConfig(data.config, campaignType);
            
            if (!validation.success) {
              // Log the validation errors but don't throw for non-critical issues
              strapi.log.warn('Campaign config validation warnings on update:', validation.errors);
              
              // Only throw for critical errors
              const criticalErrors = validation.errors.filter(err => 
                err.path.includes('type') || err.path.includes('required')
              );
              
              if (criticalErrors.length > 0) {
                const errorMessages = criticalErrors.map(err => `${err.path}: ${err.message}`).join('; ');
                throw new ApplicationError(`Campaign configuration validation failed: ${errorMessages}`, {
                  details: criticalErrors
                });
              }
            }
            
            // Use validated config (with defaults applied)
            data.config = validation.data;
            strapi.log.info(`✅ Campaign config validated for type: ${campaignType}`);
          }
        } catch (error) {
          // If validation completely fails, just ensure type is set correctly
          strapi.log.warn('Campaign config validation error on update, applying minimal fixes:', error.message);
          if (typeof data.config === 'object') {
            data.config.type = campaignType;
          }
        }
      }
      
      // Skip strict result display config validation on update - let Strapi handle it
      if (data.resultDisplayConfig) {
        strapi.log.info(`✅ Result display config provided for update`);
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
        'gpt-4.5': 'openai',
        'o3': 'openai',
        'claude-3.7-opus': 'anthropic',
        'claude-3.7-sonnet': 'anthropic',
        'claude-opus-4-20250514': 'anthropic',
        'claude-sonnet-4-20250514': 'anthropic',
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