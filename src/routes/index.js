'use strict';

/**
 * Global Routes
 * Frontend-accessible routes without authentication
 */

module.exports = [
  {
    method: 'GET',
    path: '/campaigns/public',
    handler: async (ctx) => {
      try {
        // Set CORS headers manually
        const origin = ctx.get('Origin');
        if (origin && (origin.endsWith('.vercel.app') || origin.includes('goaiex.com'))) {
          ctx.set('Access-Control-Allow-Origin', origin);
          ctx.set('Access-Control-Allow-Credentials', 'true');
          ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        }

        const campaigns = await strapi.entityService.findMany('api::campaign.campaign', {
          filters: {
            isActive: true,
            $or: [
              { status: 'active' },
              { status: null }
            ]
          },
          fields: ['title', 'slug', 'description', 'campaignType', 'isActive', 'status'],
          sort: 'createdAt:desc'
        });

        ctx.body = { data: campaigns };
      } catch (error) {
        strapi.log.error('Error finding public campaigns:', error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to fetch campaigns' };
      }
    },
    config: {
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/campaigns/public/:slug',
    handler: async (ctx) => {
      const { slug } = ctx.params;
      const debugLogger = require('../services/debug-logger.service');

      try {
        // Set CORS headers manually
        const origin = ctx.get('Origin');
        if (origin && (origin.endsWith('.vercel.app') || origin.includes('goaiex.com'))) {
          ctx.set('Access-Control-Allow-Origin', origin);
          ctx.set('Access-Control-Allow-Credentials', 'true');
          ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        }

        // Log API request start
        await debugLogger.logAPI(ctx, `/campaigns/public/${slug}`, null, null);

        const campaigns = await strapi.entityService.findMany('api::campaign.campaign', {
          filters: {
            slug,
            isActive: true
          },
          fields: ['title', 'slug', 'description', 'campaignType', 'status', 'isActive', 'config', 'jsonCode', 'previewUrl', 'aiPromptTemplate', 'resultDeliveryMode', 'showResultImmediately', 'requireEmailForResult', 'resultDisplayConfig']
        });

        if (!campaigns || campaigns.length === 0) {
          await debugLogger.logCampaign('GET_BY_SLUG', slug, { found: false }, 'ERROR', new Error('Campaign not found'), ctx);
          ctx.status = 404;
          ctx.body = { error: 'Campaign not found' };
          return;
        }

        const campaign = campaigns[0];
        
        // Log detailed campaign data before processing
        await debugLogger.logCampaign('GET_BY_SLUG', slug, {
          campaignId: campaign.id,
          fieldsReturned: Object.keys(campaign),
          hasResultDeliveryMode: !!campaign.resultDeliveryMode,
          hasResultDisplayConfig: !!campaign.resultDisplayConfig,
          hasShowResultImmediately: !!campaign.showResultImmediately,
          configSize: campaign.config ? JSON.stringify(campaign.config).length : 0,
          jsonCodeSize: campaign.jsonCode ? campaign.jsonCode.length : 0
        }, 'SUCCESS', null, ctx);
        
        // Merge jsonCode with config if jsonCode is present
        if (campaign.jsonCode && campaign.jsonCode.trim()) {
          try {
            const jsonConfig = JSON.parse(campaign.jsonCode);
            campaign.config = { ...campaign.config, ...jsonConfig };
            await debugLogger.logCampaign('JSON_MERGE', slug, { mergedFields: Object.keys(jsonConfig) }, 'SUCCESS', null, ctx);
            strapi.log.info(`Merged jsonCode config for campaign ${slug}`);
          } catch (error) {
            await debugLogger.logCampaign('JSON_MERGE', slug, { jsonCode: campaign.jsonCode }, 'ERROR', error, ctx);
            strapi.log.error(`Invalid JSON in jsonCode for campaign ${slug}:`, error);
          }
        }
        
        // Log final response data
        const responseData = { data: campaign };
        await debugLogger.logAPI(ctx, `/campaigns/public/${slug}`, responseData, null);
        
        ctx.body = responseData;
      } catch (error) {
        await debugLogger.logCampaign('GET_BY_SLUG', slug, {}, 'ERROR', error, ctx);
        strapi.log.error('Error finding campaign by slug:', error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to fetch campaign' };
      }
    },
    config: {
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/campaigns/:slug/submit',
    handler: async (ctx) => {
      const { slug } = ctx.params;
      const { firstName, email, responses } = ctx.request.body;

      try {
        // Set CORS headers manually
        const origin = ctx.get('Origin');
        if (origin && (origin.endsWith('.vercel.app') || origin.includes('goaiex.com'))) {
          ctx.set('Access-Control-Allow-Origin', origin);
          ctx.set('Access-Control-Allow-Credentials', 'true');
          ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        }

        if (!firstName || !email) {
          ctx.status = 400;
          ctx.body = { error: 'firstName and email are required' };
          return;
        }

        const campaigns = await strapi.entityService.findMany('api::campaign.campaign', {
          filters: {
            slug,
            isActive: true
          }
        });

        if (!campaigns || campaigns.length === 0) {
          ctx.status = 404;
          ctx.body = { error: 'Campaign not found or inactive' };
          return;
        }

        const campaign = campaigns[0];

        const lead = await strapi.service('api::lead.lead').processLeadSubmission({
          firstName,
          email,
          responses: responses || {},
          campaign: campaign.id
        });

        strapi.log.info(`Lead submitted: ${email} to campaign ${slug}`);

        ctx.body = { 
          data: {
            id: lead.id,
            leadScore: lead.leadScore,
            leadQuality: lead.leadQuality,
            message: 'Lead submitted successfully'
          }
        };
      } catch (error) {
        strapi.log.error('Error submitting lead:', error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to submit lead' };
      }
    },
    config: {
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/campaigns/:id/submit',
    handler: async (ctx) => {
      const { id } = ctx.params;
      const { firstName, email, responses } = ctx.request.body;

      try {
        // Set CORS headers manually
        const origin = ctx.get('Origin');
        if (origin && (origin.endsWith('.vercel.app') || origin.includes('goaiex.com'))) {
          ctx.set('Access-Control-Allow-Origin', origin);
          ctx.set('Access-Control-Allow-Credentials', 'true');
          ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        }

        if (!firstName || !email) {
          ctx.status = 400;
          ctx.body = { error: 'firstName and email are required' };
          return;
        }

        const campaign = await strapi.entityService.findOne('api::campaign.campaign', parseInt(id));

        if (!campaign) {
          ctx.status = 404;
          ctx.body = { 
            error: 'Campaign not found or inactive',
            debug: { 
              id, 
              found: !!campaign, 
              isActive: campaign?.isActive,
              status: campaign?.status,
              campaignData: campaign 
            }
          };
          return;
        }

        const lead = await strapi.service('api::lead.lead').processLeadSubmission({
          firstName,
          email,
          responses: responses || {},
          campaign: campaign.id
        });

        strapi.log.info(`Lead submitted: ${email} to campaign ID ${id}`);

        ctx.body = { 
          data: {
            id: lead.id,
            leadScore: lead.leadScore,
            leadQuality: lead.leadQuality,
            message: 'Lead submitted successfully'
          }
        };
      } catch (error) {
        strapi.log.error('Error submitting lead by ID:', error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to submit lead' };
      }
    },
    config: {
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/setup-campaign/:slug',
    handler: async (ctx) => {
      try {
        const { slug } = ctx.params;
        
        // Find campaign by slug
        const campaigns = await strapi.entityService.findMany('api::campaign.campaign', {
          filters: { slug },
          limit: 1,
        });

        if (!campaigns || campaigns.length === 0) {
          ctx.status = 404;
          ctx.body = { error: 'Campaign not found' };
          return;
        }

        // Privat vs. Gewerblich Quiz mit konditioneller Logik
        const defaultConfig = {
          title: 'AI-Bedarfsanalyse',
          description: 'Finden Sie heraus, wie KI Ihnen helfen kann',
          questions: [
            {
              id: 'user_type',
              question: 'Sind Sie Privatperson oder Unternehmer?',
              type: 'single-choice',
              options: ['Privatperson', 'Unternehmer'],
              required: true,
              order: 1,
            },
            {
              id: 'company_size',
              question: 'Wie viele Mitarbeiter hat Ihr Unternehmen?',
              type: 'single-choice',
              options: ['1-10', '11-50', '51-200', '200+'],
              required: true,
              order: 2,
              conditional: {
                showIf: {
                  field: 'user_type',
                  operator: 'equals',
                  value: 'Unternehmer'
                }
              }
            },
            {
              id: 'business_industry',
              question: 'In welcher Branche sind Sie tätig?',
              type: 'single-choice',
              options: ['Technologie', 'Handel', 'Dienstleistung', 'Produktion', 'Andere'],
              required: true,
              order: 3,
              conditional: {
                showIf: {
                  field: 'user_type',
                  operator: 'equals',
                  value: 'Unternehmer'
                }
              }
            },
            {
              id: 'private_income',
              question: 'In welcher Einkommensklasse befinden Sie sich?',
              type: 'single-choice',
              options: ['Unter 30k', '30k-60k', '60k-100k', 'Über 100k'],
              required: true,
              order: 2,
              conditional: {
                showIf: {
                  field: 'user_type',
                  operator: 'equals',
                  value: 'Privatperson'
                }
              }
            },
            {
              id: 'private_goal',
              question: 'Was ist Ihr Hauptziel mit KI?',
              type: 'single-choice',
              options: ['Weiterbildung', 'Karriere', 'Nebeneinkommen', 'Persönliche Projekte'],
              required: true,
              order: 3,
              conditional: {
                showIf: {
                  field: 'user_type',
                  operator: 'equals',
                  value: 'Privatperson'
                }
              }
            },
            {
              id: 'ai_experience',
              question: 'Wie viel Erfahrung haben Sie mit KI-Tools?',
              type: 'single-choice',
              options: ['Keine', 'Wenig', 'Mittel', 'Viel'],
              required: true,
              order: 4,
            }
          ],
          scoring: {
            logic: 'conditional',
            rules: [
              {
                if: { user_type: 'Unternehmer', company_size: '200+' },
                then: { leadScore: 95, leadQuality: 'hot' }
              },
              {
                if: { user_type: 'Unternehmer', company_size: '51-200' },
                then: { leadScore: 80, leadQuality: 'hot' }
              },
              {
                if: { user_type: 'Unternehmer', company_size: '11-50' },
                then: { leadScore: 70, leadQuality: 'warm' }
              },
              {
                if: { user_type: 'Unternehmer', company_size: '1-10' },
                then: { leadScore: 60, leadQuality: 'warm' }
              },
              {
                if: { user_type: 'Privatperson', private_income: 'Über 100k' },
                then: { leadScore: 50, leadQuality: 'warm' }
              },
              {
                if: { user_type: 'Privatperson', private_income: '60k-100k' },
                then: { leadScore: 40, leadQuality: 'cold' }
              },
              {
                if: { user_type: 'Privatperson' },
                then: { leadScore: 35, leadQuality: 'cold' }
              }
            ],
            default: { leadScore: 50, leadQuality: 'warm' }
          },
          styling: {
            primaryColor: '#007bff',
            secondaryColor: '#6c757d'
          },
          behavior: {
            showProgress: true,
            allowBack: true,
            randomizeQuestions: false,
            conditionalLogic: true
          }
        };

        // Update campaign with config
        const updatedCampaign = await strapi.entityService.update('api::campaign.campaign', campaigns[0].id, {
          data: {
            config: defaultConfig,
            aiPromptTemplate: 'Based on the user responses: {{responses}}\n\nProvide an AI readiness assessment for {{campaignTitle}}.'
          },
        });

        ctx.body = {
          success: true,
          message: 'Campaign configured successfully',
          data: updatedCampaign
        };

      } catch (error) {
        console.error('Campaign setup error:', error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to setup campaign' };
      }
    },
    config: {
      auth: false, // No authentication required for this temporary route
    },
  },
  {
    method: 'GET',
    path: '/conditional-logic/templates',
    handler: async (ctx) => {
      try {
        // Import template utility
        const { getAllTemplates, getCategories } = require('../utils/conditional-logic-templates');
        
        const templates = getAllTemplates();
        const categories = getCategories();
        
        ctx.body = {
          data: {
            templates,
            categories
          }
        };
      } catch (error) {
        strapi.log.error('Error loading templates:', error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to load templates' };
      }
    },
    config: {
      auth: false, // Allow frontend access for template preview
    },
  },
  {
    method: 'GET',
    path: '/conditional-logic/templates/:templateId',
    handler: async (ctx) => {
      try {
        const { templateId } = ctx.params;
        const { getTemplate } = require('../utils/conditional-logic-templates');
        
        const template = getTemplate(templateId);
        
        if (!template) {
          ctx.status = 404;
          ctx.body = { error: 'Template not found' };
          return;
        }
        
        ctx.body = { data: template };
      } catch (error) {
        strapi.log.error('Error loading template:', error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to load template' };
      }
    },
    config: {
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/conditional-logic/validate',
    handler: async (ctx) => {
      try {
        const { config } = ctx.request.body;
        const { validateTemplate } = require('../utils/conditional-logic-templates');
        
        if (!config) {
          ctx.status = 400;
          ctx.body = { error: 'Config is required' };
          return;
        }
        
        let parsedConfig;
        if (typeof config === 'string') {
          try {
            parsedConfig = JSON.parse(config);
          } catch (parseError) {
            ctx.status = 400;
            ctx.body = { 
              error: 'Invalid JSON format',
              details: parseError.message 
            };
            return;
          }
        } else {
          parsedConfig = config;
        }
        
        const validation = validateTemplate(parsedConfig);
        
        ctx.body = { data: validation };
      } catch (error) {
        strapi.log.error('Error validating template:', error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to validate template' };
      }
    },
    config: {
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/leads/:id/result',
    handler: async (ctx) => {
      try {
        const { id } = ctx.params;
        
        // Set CORS headers
        const origin = ctx.get('Origin');
        if (origin && (origin.endsWith('.vercel.app') || origin.includes('goaiex.com'))) {
          ctx.set('Access-Control-Allow-Origin', origin);
          ctx.set('Access-Control-Allow-Credentials', 'true');
          ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        }

        const lead = await strapi.entityService.findOne('api::lead.lead', id, {
          populate: ['campaign'],
          fields: ['id', 'firstName', 'email', 'responses', 'leadScore', 'leadQuality', 'aiResult', 'aiProcessingStatus']
        });

        // DEBUG: Log what we actually get from database
        strapi.log.info('🔍 Database Lead Debug:', {
          leadId: id,
          foundLead: !!lead,
          leadData: lead ? {
            id: lead.id,
            firstName: lead.firstName,
            email: lead.email,
            responses: lead.responses,
            responsesType: typeof lead.responses,
            responsesKeys: lead.responses ? Object.keys(lead.responses) : []
          } : null
        });

        if (!lead) {
          ctx.status = 404;
          ctx.body = { error: 'Lead not found' };
          return;
        }

        // Check if result should be shown based on campaign configuration
        const campaign = lead.campaign;
        const resultConfig = campaign?.resultDisplayConfig || {};
        const deliveryMode = campaign?.resultDeliveryMode || 'show_only';

        if (deliveryMode === 'email_only' && !resultConfig.showOnScreen) {
          ctx.status = 403;
          ctx.body = { 
            error: 'Result delivery is email-only for this campaign',
            message: 'Das Ergebnis wird per E-Mail zugestellt. Bitte prüfen Sie Ihr Postfach.'
          };
          return;
        }

        // Convert aiResult string to FormattedResult object for frontend
        const formattedResult = {
          title: "Ihre KI-Analyse Ergebnisse",
          summary: "Basierend auf Ihren Antworten haben wir eine personalisierte Analyse erstellt:",
          sections: [
            {
              title: "KI-Bedarfsanalyse",
              content: lead.aiResult || "Die Analyse wurde erfolgreich abgeschlossen.",
              type: "text"
            }
          ],
          recommendations: [],
          nextSteps: [],
          metadata: {
            processingTime: 15000,
            aiProvider: "AI System",
            confidence: 0.9,
            leadScore: lead.leadScore,
            leadQuality: lead.leadQuality
          }
        };

        // Return result data in FormattedResult format
        ctx.body = {
          data: {
            id: lead.id,
            leadId: lead.id,
            firstName: lead.firstName,
            email: lead.email,
            responses: lead.responses,
            leadScore: lead.leadScore,
            leadQuality: lead.leadQuality,
            aiResult: formattedResult,
            aiProcessingStatus: lead.aiProcessingStatus,
            campaign: {
              title: campaign?.title,
              resultDisplayConfig: resultConfig
            },
            canShowResult: deliveryMode !== 'email_only',
            resultDeliveryMode: deliveryMode
          }
        };
      } catch (error) {
        strapi.log.error('Error fetching lead result:', error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to fetch result' };
      }
    },
    config: {
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/leads/:id/status',
    handler: async (ctx) => {
      const { id } = ctx.params;
      const debugLogger = require('../services/debug-logger.service');
      
      try {
        // Set CORS headers
        const origin = ctx.get('Origin');
        if (origin && (origin.endsWith('.vercel.app') || origin.includes('goaiex.com'))) {
          ctx.set('Access-Control-Allow-Origin', origin);
          ctx.set('Access-Control-Allow-Credentials', 'true');
          ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        }

        // Log API request
        await debugLogger.logAPI(ctx, `/leads/${id}/status`, null, null);

        const lead = await strapi.entityService.findOne('api::lead.lead', id);

        if (!lead) {
          await debugLogger.logLead('GET_STATUS', id, { found: false }, 'ERROR', new Error('Lead not found'), ctx);
          ctx.status = 404;
          ctx.body = { error: 'Lead not found' };
          return;
        }

        // Log lead status details
        await debugLogger.logLead('GET_STATUS', id, {
          leadId: lead.id,
          status: lead.aiProcessingStatus,
          progress: lead.processingProgress,
          currentStep: lead.currentProcessingStep,
          hasAiResult: !!lead.aiResult,
          leadScore: lead.leadScore,
          leadQuality: lead.leadQuality
        }, 'SUCCESS', null, ctx);

        // Calculate correct progress based on status
        const status = lead.aiProcessingStatus || 'pending';
        const progress = status === 'completed' ? 100 : (lead.processingProgress || 0);
        const currentStep = status === 'completed' ? 'Analyse abgeschlossen' : (lead.currentProcessingStep || 'Initializing...');

        // Return lead processing status
        const responseData = {
          success: true,
          data: {
            id: lead.id,
            status: status,
            progress: progress,
            currentStep: currentStep,
            estimatedTimeRemaining: lead.estimatedTimeRemaining || null,
            aiResult: lead.aiResult || null,
            leadScore: lead.leadScore,
            leadQuality: lead.leadQuality
          }
        };
        
        await debugLogger.logAPI(ctx, `/leads/${id}/status`, responseData, null);
        ctx.body = responseData;
      } catch (error) {
        await debugLogger.logLead('GET_STATUS', id, {}, 'ERROR', error, ctx);
        strapi.log.error('Error fetching lead status:', error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to fetch lead status' };
      }
    },
    config: {
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/campaigns/:slug/configure-result-delivery',
    handler: async (ctx) => {
      try {
        const { slug } = ctx.params;
        const { resultDeliveryMode, resultDisplayConfig } = ctx.request.body;

        // Set CORS headers
        const origin = ctx.get('Origin');
        if (origin && (origin.endsWith('.vercel.app') || origin.includes('goaiex.com'))) {
          ctx.set('Access-Control-Allow-Origin', origin);
          ctx.set('Access-Control-Allow-Credentials', 'true');
          ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        }

        const campaigns = await strapi.entityService.findMany('api::campaign.campaign', {
          filters: { slug }
        });

        if (!campaigns || campaigns.length === 0) {
          ctx.status = 404;
          ctx.body = { error: 'Campaign not found' };
          return;
        }

        const campaign = campaigns[0];

        // Update campaign result delivery configuration
        const updateData = {};
        if (resultDeliveryMode) {
          updateData.resultDeliveryMode = resultDeliveryMode;
        }
        if (resultDisplayConfig) {
          updateData.resultDisplayConfig = {
            ...campaign.resultDisplayConfig,
            ...resultDisplayConfig
          };
        }

        const updatedCampaign = await strapi.entityService.update('api::campaign.campaign', campaign.id, {
          data: updateData
        });

        ctx.body = {
          data: {
            id: updatedCampaign.id,
            resultDeliveryMode: updatedCampaign.resultDeliveryMode,
            resultDisplayConfig: updatedCampaign.resultDisplayConfig
          }
        };
      } catch (error) {
        strapi.log.error('Error configuring result delivery:', error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to configure result delivery' };
      }
    },
    config: {
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/ai/test-prompt',
    handler: async (ctx) => {
      try {
        const { promptTemplate, sampleDataId, providers, model } = ctx.request.body;

        if (!promptTemplate) {
          ctx.status = 400;
          ctx.body = { error: 'Prompt template is required' };
          return;
        }

        // Get AI Provider Service
        const aiService = require('../services/ai-provider.service');
        
        // Get sample data
        const sampleDataOptions = aiService.getSampleData();
        const sampleData = sampleDataId 
          ? sampleDataOptions.find(s => s.name === sampleDataId)?.data || sampleDataOptions[0].data
          : sampleDataOptions[0].data;

        // Test the prompt
        const results = await aiService.testPrompt(promptTemplate, sampleData, {
          providers: providers || ['openai', 'anthropic', 'gemini'],
          model: model || 'auto'
        });

        ctx.body = {
          success: true,
          data: results
        };

      } catch (error) {
        strapi.log.error('Error testing prompt:', error);
        ctx.status = 500;
        ctx.body = { 
          success: false,
          error: 'Failed to test prompt',
          details: error.message 
        };
      }
    },
    config: {
      auth: false, // TODO: Add admin authentication
    },
  },
  {
    method: 'GET',
    path: '/ai/status',
    handler: async (ctx) => {
      try {
        const aiService = require('../services/ai-provider.service');
        const status = aiService.getStatus();
        
        ctx.body = {
          success: true,
          data: status
        };
      } catch (error) {
        strapi.log.error('Error getting AI status:', error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to get AI status' };
      }
    },
    config: {
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/ai/sample-data',
    handler: async (ctx) => {
      try {
        const aiService = require('../services/ai-provider.service');
        const sampleData = aiService.getSampleData();
        
        ctx.body = {
          success: true,
          data: sampleData
        };
      } catch (error) {
        strapi.log.error('Error getting sample data:', error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to get sample data' };
      }
    },
    config: {
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/ai/prompt-templates',
    handler: async (ctx) => {
      try {
        // Load prompt templates
        const templates = {
          'business-analysis': {
            name: 'Business AI-Analyse',
            description: 'Für B2B-Leads mit Fokus auf Business-Potenzial',
            template: `Erstelle eine personalisierte AI-Bedarfsanalyse für {{firstName}}.

Basis-Informationen:
- Name: {{firstName}}
- E-Mail: {{email}}
- Lead-Score: {{leadScore}}/100
- Lead-Qualität: {{leadQuality}}

Antworten aus dem Quiz:
{{responses}}

Erstelle eine professionelle, strukturierte Empfehlung mit folgenden Bereichen:
1. 🎯 Persönliche Einschätzung (basierend auf den Antworten)
2. 💡 AI-Potenzial für das Unternehmen/die Person
3. 📋 Konkrete nächste Schritte
4. 🚀 Individuelle Empfehlungen

Stil: Professionell, präzise, actionable. Nutze Emojis für bessere Struktur.`
          },
          'personal-coaching': {
            name: 'Personal AI-Coaching',
            description: 'Für Privatpersonen mit Fokus auf persönliche Entwicklung',
            template: `Erstelle ein personalisiertes AI-Coaching-Ergebnis für {{firstName}}.

Lead-Informationen:
- Name: {{firstName}}
- Lead-Score: {{leadScore}}/100
- Qualifikation: {{leadQuality}}

Quiz-Antworten:
{{responses}}

Erstelle eine motivierende, persönliche Empfehlung:

🎯 **Deine AI-Persönlichkeitsanalyse**
[Basierend auf den Antworten eine persönliche Einschätzung]

💡 **AI-Potenzial für dich**
[Wie AI dir persönlich helfen kann]

📚 **Empfohlene nächste Schritte**
[Konkrete, umsetzbare Schritte]

🚀 **Dein Weg zum AI-Experten**
[Personalisierte Roadmap]

Ton: Persönlich, motivierend, ermutigend aber professionell.`
          },
          'technical-assessment': {
            name: 'Technische AI-Bewertung',
            description: 'Für Tech-affine Zielgruppen mit detaillierten Empfehlungen',
            template: `Technische AI-Expertise-Bewertung für {{firstName}}.

Daten:
- Lead-Score: {{leadScore}}/100
- Qualifikation: {{leadQuality}}
- Antworten: {{responses}}

Erstelle eine technisch fundierte Analyse:

## 🔍 Expertise-Level Analyse
[Bewertung der aktuellen AI-Kenntnisse]

## ⚙️ Technische Empfehlungen
- Tools & Frameworks
- APIs & Integrationen
- Best Practices

## 🛠 Implementation Roadmap
[Schritt-für-Schritt technischer Plan]

## 📊 ROI-Projektion
[Erwartete Effizienzgewinne]

## 🔗 Nützliche Ressourcen
[Spezifische Tools und Links]

Stil: Technisch präzise, aber verständlich. Fokus auf Umsetzbarkeit.`
          },
          'sales-focused': {
            name: 'Sales-orientierte Empfehlung',
            description: 'Optimiert für Lead-Konversion und Sales-Prozess',
            template: `Sales-optimierte Empfehlung für {{firstName}} ({{leadQuality}} Lead).

Lead-Details:
- Score: {{leadScore}}/100
- Antworten: {{responses}}

Erstelle eine verkaufsfördernde Empfehlung:

🔥 **Warum AI jetzt perfekt für Sie ist**
[Urgency und Relevanz schaffen]

💰 **Ihr ROI-Potenzial**
[Konkrete Zahlen und Einsparungen]

⏰ **Exklusive Chance**
[Begrenzte Angebote oder Termine]

📞 **Ihr nächster Schritt**
[Klarer Call-to-Action]

🎁 **Bonus für schnelle Entscheider**
[Incentive für sofortige Aktion]

Stil: Überzeugend, nutzenorientiert, mit klaren CTAs. Nicht aufdringlich aber verkaufsstark.`
          }
        };

        ctx.body = {
          success: true,
          data: Object.entries(templates).map(([id, template]) => ({
            id,
            ...template
          }))
        };
      } catch (error) {
        strapi.log.error('Error getting prompt templates:', error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to get prompt templates' };
      }
    },
    config: {
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/debug/campaigns',
    handler: async (ctx) => {
      try {
        // Set CORS headers
        const origin = ctx.get('Origin');
        if (origin && (origin.endsWith('.vercel.app') || origin.includes('goaiex.com'))) {
          ctx.set('Access-Control-Allow-Origin', origin);
          ctx.set('Access-Control-Allow-Credentials', 'true');
          ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        }

        const campaigns = await strapi.entityService.findMany('api::campaign.campaign', {
          fields: ['id', 'title', 'slug', 'isActive', 'status'],
          sort: 'id:asc'
        });

        ctx.body = {
          success: true,
          data: {
            campaigns,
            count: campaigns.length,
            routes: {
              bySlug: campaigns.map(c => `/campaigns/${c.slug}/submit`),
              byId: campaigns.map(c => `/campaigns/${c.id}/submit`)
            }
          }
        };
      } catch (error) {
        strapi.log.error('Error in debug campaigns:', error);
        ctx.status = 500;
        ctx.body = { error: 'Debug failed' };
      }
    },
    config: {
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/debug/logs',
    handler: async (ctx) => {
      try {
        const debugLogger = require('../services/debug-logger.service');
        
        // Set CORS headers
        const origin = ctx.get('Origin');
        if (origin && (origin.endsWith('.vercel.app') || origin.includes('goaiex.com'))) {
          ctx.set('Access-Control-Allow-Origin', origin);
          ctx.set('Access-Control-Allow-Credentials', 'true');
          ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        }

        const { component, limit = 20 } = ctx.query;
        const logs = await debugLogger.getRecentLogs(component, parseInt(limit));
        const errorSummary = await debugLogger.getErrorSummary(24);
        
        ctx.body = {
          success: true,
          data: {
            logs,
            errorSummary,
            filters: { component, limit }
          }
        };
      } catch (error) {
        strapi.log.error('Error fetching debug logs:', error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to fetch debug logs' };
      }
    },
    config: {
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/debug/init-table',
    handler: async (ctx) => {
      try {
        // Create debug table if it doesn't exist
        const knex = strapi.db.connection;
        
        const tableExists = await knex.schema.hasTable('system_debug');
        if (!tableExists) {
          await knex.schema.createTable('system_debug', (table) => {
            table.increments('id').primary();
            table.string('component', 50).notNullable();
            table.string('action', 100).notNullable();
            table.string('status', 20).defaultTo('INFO');
            table.text('details');
            table.text('error_message');
            table.text('user_agent');
            table.string('ip_address', 45);
            table.string('session_id', 32);
            table.timestamp('timestamp').defaultTo(knex.fn.now());
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('updated_at').defaultTo(knex.fn.now());
            
            // Indexes
            table.index(['component']);
            table.index(['status']);
            table.index(['timestamp']);
            table.index(['component', 'action']);
          });
          
          ctx.body = { success: true, message: 'Debug table created successfully' };
        } else {
          ctx.body = { success: true, message: 'Debug table already exists' };
        }
        
        // Log the initialization
        const debugLogger = require('../services/debug-logger.service');
        await debugLogger.logSystem('TABLE_INIT', { tableExists }, 'SUCCESS');
        
      } catch (error) {
        strapi.log.error('Error initializing debug table:', error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to initialize debug table' };
      }
    },
    config: {
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/admin/fix-campaigns',
    handler: async (ctx) => {
      try {
        console.log('🔧 Fixing campaign isActive status...');
        
        // Update Campaign 1 (test-quiz2)
        const campaign1 = await strapi.entityService.update('api::campaign.campaign', 1, {
          data: {
            isActive: true,
            status: 'active'
          }
        });
        
        // Update Campaign 2 (test3)  
        const campaign2 = await strapi.entityService.update('api::campaign.campaign', 2, {
          data: {
            isActive: true,
            status: 'active'
          }
        });
        
        console.log('✅ Both campaigns updated successfully');
        
        ctx.body = {
          success: true,
          message: 'Campaigns fixed successfully',
          campaigns: [
            { id: 1, title: campaign1.title, isActive: campaign1.isActive },
            { id: 2, title: campaign2.title, isActive: campaign2.isActive }
          ]
        };
        
      } catch (error) {
        console.error('❌ Error fixing campaigns:', error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to fix campaigns', details: error.message };
      }
    },
    config: {
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/admin/debug-leads',
    handler: async (ctx) => {
      try {
        console.log('🔍 Debug leads request...');
        
        // Get all leads with basic info
        const leads = await strapi.entityService.findMany('api::lead.lead', {
          fields: ['id', 'firstName', 'email', 'responses', 'leadScore', 'leadQuality', 'aiProcessingStatus'],
          populate: {
            campaign: {
              fields: ['id', 'title', 'slug']
            }
          },
          sort: 'id:desc',
          limit: 10
        });
        
        console.log(`✅ Found ${leads.length} leads`);
        
        ctx.body = {
          success: true,
          message: `Found ${leads.length} leads`,
          data: {
            leads: leads.map(lead => ({
              id: lead.id,
              firstName: lead.firstName,
              email: lead.email,
              responses: lead.responses,
              hasResponses: !!lead.responses && Object.keys(lead.responses || {}).length > 0,
              leadScore: lead.leadScore,
              leadQuality: lead.leadQuality,
              aiProcessingStatus: lead.aiProcessingStatus,
              campaign: lead.campaign ? {
                id: lead.campaign.id,
                title: lead.campaign.title,
                slug: lead.campaign.slug
              } : null
            }))
          }
        };
        
      } catch (error) {
        console.error('❌ Error debugging leads:', error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to debug leads', details: error.message };
      }
    },
    config: {
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/email/test',
    handler: async (ctx) => {
      try {
        const { to, subject, content } = ctx.request.body;
        
        if (!to || !subject || !content) {
          ctx.status = 400;
          ctx.body = { error: 'Missing required fields: to, subject, content' };
          return;
        }

        const emailService = require('../services/email.service');
        
        const result = await emailService.sendTestEmail(to, subject, content);

        ctx.body = {
          success: true,
          message: 'Test email sent successfully',
          data: result
        };
        
      } catch (error) {
        strapi.log.error('Error sending test email:', error);
        ctx.status = 500;
        ctx.body = { 
          success: false,
          error: 'Failed to send test email',
          details: error.message 
        };
      }
    },
    config: {
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/email/status',
    handler: async (ctx) => {
      try {
        const emailService = require('../services/email.service');
        const status = emailService.getStatus();
        
        // Debug environment variables (safely)
        const envDebug = {
          EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'NOT_SET',
          SMTP_HOST: process.env.SMTP_HOST || 'NOT_SET',
          SMTP_PORT: process.env.SMTP_PORT || 'NOT_SET',
          SMTP_USERNAME: process.env.SMTP_USERNAME ? 'SET' : 'NOT_SET',
          SMTP_PASSWORD: process.env.SMTP_PASSWORD ? 'SET' : 'NOT_SET',
          SMTP_USER: process.env.SMTP_USER ? 'SET' : 'NOT_SET',
          SMTP_PASS: process.env.SMTP_PASS ? 'SET' : 'NOT_SET'
        };
        
        ctx.body = {
          success: true,
          data: {
            ...status,
            envDebug
          }
        };
        
      } catch (error) {
        strapi.log.error('Error getting email status:', error);
        ctx.status = 500;
        ctx.body = { 
          success: false,
          error: 'Failed to get email status',
          details: error.message 
        };
      }
    },
    config: {
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/email/reinit',
    handler: async (ctx) => {
      try {
        strapi.log.info('🔄 Manual email service reinitialization...');
        
        const emailService = require('../services/email.service');
        
        // Force reinitialize
        await emailService.init();
        
        const status = emailService.getStatus();
        
        ctx.body = {
          success: true,
          message: 'Email service reinitialized',
          data: status
        };
        
      } catch (error) {
        strapi.log.error('Email service reinit failed:', error);
        ctx.status = 500;
        ctx.body = { 
          success: false,
          error: 'Failed to reinitialize email service',
          details: error.message 
        };
      }
    },
    config: {
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/leads/:id/reprocess',
    handler: async (ctx) => {
      const { id } = ctx.params;
      const { sendEmail = false } = ctx.request.body;

      try {
        // Set CORS headers
        const origin = ctx.get('Origin');
        if (origin && (origin.endsWith('.vercel.app') || origin.includes('goaiex.com'))) {
          ctx.set('Access-Control-Allow-Origin', origin);
          ctx.set('Access-Control-Allow-Credentials', 'true');
          ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        }

        // Get lead with campaign
        const lead = await strapi.entityService.findOne('api::lead.lead', id, {
          populate: ['campaign']
        });

        if (!lead) {
          ctx.status = 404;
          ctx.body = { error: 'Lead not found' };
          return;
        }

        strapi.log.info(`🔄 Reprocessing lead ${id} (email: ${sendEmail})`);

        // Update processing status
        await strapi.entityService.update('api::lead.lead', id, {
          data: { aiProcessingStatus: 'processing' }
        });

        // Generate AI result
        const leadService = strapi.service('api::lead.lead');
        const aiResult = await leadService.generateAIResult(lead, lead.campaign);

        // Update lead with result
        const updatedLead = await strapi.entityService.update('api::lead.lead', id, {
          data: {
            aiResult,
            aiProcessingStatus: 'completed'
          }
        });

        let emailResult = null;
        
        // Send email if requested
        if (sendEmail && lead.email) {
          emailResult = await leadService.sendResultEmail(lead, lead.campaign, aiResult);
        }

        strapi.log.info(`✅ Lead ${id} reprocessed successfully`);

        ctx.body = {
          success: true,
          data: {
            id: updatedLead.id,
            aiResult,
            aiProcessingStatus: 'completed',
            emailSent: emailResult?.success || false,
            emailStatus: emailResult?.success ? 'sent' : (emailResult?.skipReason || 'not_sent')
          }
        };

      } catch (error) {
        strapi.log.error('Error reprocessing lead:', error);
        
        // Update status to failed
        await strapi.entityService.update('api::lead.lead', id, {
          data: { aiProcessingStatus: 'failed' }
        });

        ctx.status = 500;
        ctx.body = { 
          success: false,
          error: 'Failed to reprocess lead',
          details: error.message 
        };
      }
    },
    config: {
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/queues/status',
    handler: async (ctx) => {
      try {
        if (!strapi.queueService) {
          ctx.body = {
            success: false,
            message: 'Queue service not available',
            data: { enabled: false, available: false }
          };
          return;
        }

        const serviceStatus = strapi.queueService.getServiceStatus();
        let stats = {};

        try {
          if (serviceStatus.isInitialized && serviceStatus.queueCount > 0) {
            stats = await strapi.queueService.getAllQueueStats();
          }
        } catch (statsError) {
          strapi.log.warn('Could not get queue stats:', statsError.message);
          stats = { error: 'Stats unavailable' };
        }
        
        ctx.body = {
          success: true,
          data: {
            enabled: true,
            available: true,
            ...serviceStatus,
            stats
          }
        };

      } catch (error) {
        strapi.log.error('Error getting queue status:', error);
        ctx.status = 500;
        ctx.body = { 
          success: false,
          error: 'Failed to get queue status',
          details: error.message 
        };
      }
    },
    config: {
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/queues/:queueName/pause',
    handler: async (ctx) => {
      const { queueName } = ctx.params;

      try {
        if (!strapi.queueService) {
          ctx.status = 503;
          ctx.body = { error: 'Queue service not available' };
          return;
        }

        if (!strapi.queueService.isInitialized) {
          ctx.status = 503;
          ctx.body = { error: 'Queue service not initialized' };
          return;
        }

        await strapi.queueService.pauseQueue(queueName);
        
        ctx.body = {
          success: true,
          message: `Queue ${queueName} paused`
        };

      } catch (error) {
        strapi.log.error(`Error pausing queue ${queueName}:`, error);
        ctx.status = 500;
        ctx.body = { 
          success: false,
          error: 'Failed to pause queue',
          details: error.message 
        };
      }
    },
    config: {
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/queues/:queueName/resume',
    handler: async (ctx) => {
      const { queueName } = ctx.params;

      try {
        if (!strapi.queueService) {
          ctx.status = 503;
          ctx.body = { error: 'Queue service not available' };
          return;
        }

        if (!strapi.queueService.isInitialized) {
          ctx.status = 503;
          ctx.body = { error: 'Queue service not initialized' };
          return;
        }

        await strapi.queueService.resumeQueue(queueName);
        
        ctx.body = {
          success: true,
          message: `Queue ${queueName} resumed`
        };

      } catch (error) {
        strapi.log.error(`Error resuming queue ${queueName}:`, error);
        ctx.status = 500;
        ctx.body = { 
          success: false,
          error: 'Failed to resume queue',
          details: error.message 
        };
      }
    },
    config: {
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/debug/queue-status',
    handler: async (ctx) => {
      try {
        // Set CORS headers
        const origin = ctx.get('Origin');
        if (origin && (origin.endsWith('.vercel.app') || origin.includes('goaiex.com'))) {
          ctx.set('Access-Control-Allow-Origin', origin);
          ctx.set('Access-Control-Allow-Credentials', 'true');
          ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        }

        // Queue service debug info
        const queueDebug = {
          available: !!strapi.queueService,
          initialized: strapi.queueService?.isInitialized || false,
          serviceStatus: strapi.queueService?.getServiceStatus() || null
        };

        // Environment debug
        const envDebug = {
          QUEUE_REDIS_HOST: process.env.QUEUE_REDIS_HOST || process.env.REDIS_HOST || 'NOT_SET',
          QUEUE_REDIS_PORT: process.env.QUEUE_REDIS_PORT || process.env.REDIS_PORT || 'NOT_SET',
          QUEUE_REDIS_PASSWORD: process.env.QUEUE_REDIS_PASSWORD || process.env.REDIS_PASSWORD ? 'SET' : 'NOT_SET',
          NODE_ENV: process.env.NODE_ENV || 'NOT_SET'
        };

        // Test Redis connection if service is available
        let redisTest = null;
        if (strapi.queueService) {
          try {
            redisTest = await strapi.queueService.testRedisConnection();
          } catch (error) {
            redisTest = { error: error.message };
          }
        }

        ctx.body = {
          success: true,
          data: {
            queue: queueDebug,
            environment: envDebug,
            redis: redisTest,
            timestamp: new Date().toISOString()
          }
        };
      } catch (error) {
        strapi.log.error('Error getting debug queue status:', error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to get debug queue status' };
      }
    },
    config: {
      auth: false,
    },
  },
  
  // Favicon route fix
  {
    method: 'GET',
    path: '/favicon.ico',
    handler: async (ctx) => {
      try {
        const fs = require('fs');
        const path = require('path');
        
        const faviconPath = path.join(process.cwd(), 'public', 'favicon.ico');
        
        if (fs.existsSync(faviconPath)) {
          ctx.type = 'image/x-icon';
          ctx.body = fs.readFileSync(faviconPath);
        } else {
          ctx.status = 204; // No content instead of 500
        }
      } catch (error) {
        strapi.log.warn('Favicon not found:', error);
        ctx.status = 204; // No content instead of error
      }
    },
    config: {
      auth: false,
    },
  },
];