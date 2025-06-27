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
          fields: ['title', 'slug', 'description', 'campaignType', 'status', 'isActive', 'config', 'jsonCode', 'previewUrl', 'aiPromptTemplate']
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

        const campaign = await strapi.entityService.findOne('api::campaign.campaign', id, {
          filters: {
            isActive: true
          }
        });

        if (!campaign) {
          ctx.status = 404;
          ctx.body = { error: 'Campaign not found or inactive' };
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
    method: 'POST',
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
];