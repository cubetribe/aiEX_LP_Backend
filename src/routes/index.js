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
          fields: ['title', 'slug', 'description', 'campaignType'],
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
            slug,
            isActive: true
          },
          fields: ['title', 'slug', 'description', 'campaignType', 'status', 'isActive', 'config', 'jsonCode', 'previewUrl', 'aiPromptTemplate', 'resultDeliveryMode', 'showResultImmediately', 'requireEmailForResult', 'resultDisplayConfig']
        });

        if (!campaigns || campaigns.length === 0) {
          ctx.status = 404;
          ctx.body = { error: 'Campaign not found' };
          return;
        }

        const campaign = campaigns[0];
        
        // Merge jsonCode with config if jsonCode is present
        if (campaign.jsonCode && campaign.jsonCode.trim()) {
          try {
            const jsonConfig = JSON.parse(campaign.jsonCode);
            campaign.config = { ...campaign.config, ...jsonConfig };
            strapi.log.info(`Merged jsonCode config for campaign ${slug}`);
          } catch (error) {
            strapi.log.error(`Invalid JSON in jsonCode for campaign ${slug}:`, error);
          }
        }
        
        ctx.body = { data: campaign };
      } catch (error) {
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

        if (!campaign || !campaign.isActive) {
          ctx.status = 404;
          ctx.body = { 
            error: 'Campaign not found or inactive',
            debug: { 
              id, 
              found: !!campaign, 
              isActive: campaign?.isActive 
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
          populate: ['campaign']
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

        // Return result data
        ctx.body = {
          data: {
            leadId: lead.id,
            leadScore: lead.leadScore,
            leadQuality: lead.leadQuality,
            aiResult: lead.aiResult,
            aiProcessingStatus: lead.aiProcessingStatus,
            firstName: lead.firstName,
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
];