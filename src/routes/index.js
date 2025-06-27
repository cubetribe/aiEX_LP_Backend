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
          fields: ['title', 'slug', 'description', 'campaignType', 'status', 'isActive', 'config', 'aiPromptTemplate']
        });

        if (!campaigns || campaigns.length === 0) {
          ctx.status = 404;
          ctx.body = { error: 'Campaign not found' };
          return;
        }

        ctx.body = { data: campaigns[0] };
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

        // Default quiz configuration
        const defaultConfig = {
          title: 'AI Readiness Assessment',
          description: 'Discover how ready your business is for AI transformation',
          questions: [
            {
              id: 'q1',
              question: 'What is your current level of AI adoption?',
              type: 'single-choice',
              options: ['No AI usage', 'Exploring AI', 'Pilot projects', 'Full implementation'],
              required: true,
              order: 1,
            },
            {
              id: 'q2',
              question: 'What are your main business challenges?',
              type: 'multiple-choice',
              options: ['Cost reduction', 'Efficiency', 'Customer experience', 'Innovation'],
              required: true,
              order: 2,
            },
          ],
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
            randomizeQuestions: false
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