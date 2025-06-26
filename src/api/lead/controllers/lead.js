/**
 * Lead Controller
 * Handles lead-related API endpoints for GoAIX platform
 */

'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { ValidationError } = require('@strapi/utils').errors;
const Joi = require('joi');

/**
 * Lead controller with custom endpoints for lead management
 */
module.exports = createCoreController('api::lead.lead', ({ strapi }) => ({

  /**
   * Submit lead via campaign (Frontend endpoint)
   * POST /api/leads/submit
   */
  async submit(ctx) {
    const { body } = ctx.request;

    try {
      // Validate input data with comprehensive schema
      const leadSchema = Joi.object({
        campaignSlug: Joi.string().alphanum().min(3).max(100).required(),
        firstName: Joi.string().min(1).max(100).required(),
        lastName: Joi.string().max(100).optional(),
        email: Joi.string().email().max(255).required(),
        phone: Joi.string().pattern(/^[+]?[0-9\s\-\(\)]+$/).max(20).optional(),
        company: Joi.string().max(200).optional(),
        jobTitle: Joi.string().max(100).optional(),
        responses: Joi.object().required(),
        consentGiven: Joi.boolean().required(),
        marketingOptIn: Joi.boolean().default(false),
        customFields: Joi.object().optional(),
        notes: Joi.string().max(500).optional(),
        // UTM parameters
        utmSource: Joi.string().max(100).optional(),
        utmMedium: Joi.string().max(100).optional(),
        utmCampaign: Joi.string().max(100).optional(),
        utmTerm: Joi.string().max(100).optional(),
        utmContent: Joi.string().max(100).optional(),
      });

      const { error, value } = leadSchema.validate(body);
      if (error) {
        return ctx.badRequest(`Validation error: ${error.details[0].message}`);
      }

      // Check consent requirement
      if (!value.consentGiven) {
        return ctx.badRequest('User consent is required for data processing');
      }

      // Find campaign by slug
      const campaigns = await strapi.entityService.findMany('api::campaign.campaign', {
        filters: {
          slug: value.campaignSlug,
          isActive: true,
          isPublic: true,
        },
      });

      if (!campaigns || campaigns.length === 0) {
        return ctx.notFound('Campaign not found or not available');
      }

      const campaign = campaigns[0];

      // Validate campaign constraints
      const now = new Date();
      if (campaign.startDate && new Date(campaign.startDate) > now) {
        return ctx.forbidden('Campaign has not started yet');
      }
      
      if (campaign.endDate && new Date(campaign.endDate) < now) {
        return ctx.forbidden('Campaign has ended');
      }

      if (campaign.maxLeads && campaign.currentLeadCount >= campaign.maxLeads) {
        return ctx.forbidden('Campaign has reached maximum capacity');
      }

      // Extract tracking information from request
      const trackingData = {
        ipAddress: ctx.request.ip,
        userAgent: ctx.request.headers['user-agent'],
        referrer: ctx.request.headers.referer,
        utmSource: value.utmSource || ctx.query.utm_source,
        utmMedium: value.utmMedium || ctx.query.utm_medium,
        utmCampaign: value.utmCampaign || ctx.query.utm_campaign,
        utmTerm: value.utmTerm || ctx.query.utm_term,
        utmContent: value.utmContent || ctx.query.utm_content,
      };

      // Create lead data
      const leadData = {
        campaign: campaign.id,
        firstName: value.firstName,
        lastName: value.lastName,
        email: value.email,
        phone: value.phone,
        company: value.company,
        jobTitle: value.jobTitle,
        responses: value.responses,
        consentGiven: value.consentGiven,
        marketingOptIn: value.marketingOptIn,
        customFields: value.customFields || {},
        notes: value.notes,
        ...trackingData,
        consentTimestamp: new Date(),
        aiProcessingStatus: 'pending',
      };

      // Create lead directly
      const lead = await strapi.entityService.create('api::lead.lead', {
        data: leadData,
        populate: ['campaign'],
      });

      // Queue AI processing job (optional)
      try {
        const queueService = strapi.service('api::queue.queue');
        if (queueService && queueService.addAIProcessingJob) {
          await queueService.addAIProcessingJob({
            leadId: lead.id,
            campaignId: campaign.id,
          });

          // Queue Google Sheets export job if configured
          if (campaign.googleSheetId && queueService.addSheetsExportJob) {
            await queueService.addSheetsExportJob({
              leadId: lead.id,
              campaignId: campaign.id,
            }, { delay: 2000 });
          }

          // Queue analytics tracking
          if (queueService.addAnalyticsJob) {
            await queueService.addAnalyticsJob({
              event: 'lead_submitted',
              data: {
                leadId: lead.id,
                campaignId: campaign.id,
                campaignSlug: campaign.slug,
                leadScore: lead.leadScore || 0,
                leadQuality: lead.leadQuality || 'unqualified',
              },
            });
          }
        }
      } catch (error) {
        strapi.log.warn('⚠️ Queue service not available, lead created but not queued for processing:', error.message);
      }

      // Return optimized response for frontend
      const response = {
        success: true,
        message: 'Lead submitted successfully',
        data: {
          leadId: lead.id,
          firstName: lead.firstName,
          email: lead.email,
          leadScore: lead.leadScore,
          leadQuality: lead.leadQuality,
          processingStatus: 'queued',
          estimatedProcessingTime: '2-5 minutes',
          campaign: {
            id: campaign.id,
            slug: campaign.slug,
            title: campaign.title,
            type: campaign.campaignType,
          },
        },
      };

      strapi.log.info(`✅ Lead submitted via frontend: ${lead.id} for campaign: ${campaign.slug}`);

      return ctx.send(response, 201);

    } catch (error) {
      strapi.log.error('❌ Lead submission failed:', error);
      
      if (error.message.includes('Validation')) {
        return ctx.badRequest(error.message);
      }
      
      return ctx.internalServerError('Lead submission failed. Please try again.');
    }
  },

  /**
   * Create a new lead (Admin endpoint)
   * POST /api/leads
   */
  async create(ctx) {
    const { body } = ctx.request;

    try {
      // Validate input data
      const leadSchema = Joi.object({
        campaign: Joi.number().integer().positive().required(),
        firstName: Joi.string().min(1).max(100).required(),
        lastName: Joi.string().max(100).optional(),
        email: Joi.string().email().max(255).required(),
        phone: Joi.string().pattern(/^[+]?[0-9\s\-\(\)]+$/).max(20).optional(),
        company: Joi.string().max(200).optional(),
        jobTitle: Joi.string().max(100).optional(),
        responses: Joi.object().required(),
        consentGiven: Joi.boolean().required(),
        marketingOptIn: Joi.boolean().optional(),
        customFields: Joi.object().optional(),
        notes: Joi.string().max(2000).optional(),
      });

      const { error, value } = leadSchema.validate(body);
      if (error) {
        throw new ValidationError(`Validation error: ${error.details[0].message}`);
      }

      // Check consent
      if (!value.consentGiven) {
        throw new ValidationError('User consent is required');
      }

      // Verify campaign exists and is active
      const campaign = await strapi.entityService.findOne('api::campaign.campaign', value.campaign);
      if (!campaign) {
        throw new ValidationError('Campaign not found');
      }

      if (!campaign.isActive) {
        throw new ValidationError('Campaign is not active');
      }

      // Extract tracking information from request
      const trackingData = {
        ipAddress: ctx.request.ip,
        userAgent: ctx.request.headers['user-agent'],
        referrer: ctx.request.headers.referer,
        utmSource: ctx.query.utm_source,
        utmMedium: ctx.query.utm_medium,
        utmCampaign: ctx.query.utm_campaign,
        utmTerm: ctx.query.utm_term,
        utmContent: ctx.query.utm_content,
      };

      // Create lead data
      const leadData = {
        ...value,
        consentTimestamp: new Date(),
        ...trackingData,
      };

      // Create lead
      const lead = await strapi.entityService.create('api::lead.lead', {
        data: leadData,
        populate: ['campaign'],
      });

      // Update campaign lead count
      await strapi.entityService.update('api::campaign.campaign', campaign.id, {
        data: {
          currentLeadCount: campaign.currentLeadCount + 1,
        },
      });

      // Queue AI processing job (optional)
      try {
        const queueService = strapi.service('api::queue.queue');
        if (queueService && queueService.addAIProcessingJob) {
          await queueService.addAIProcessingJob({
            leadId: lead.id,
            campaignId: campaign.id,
          });

          // Queue Google Sheets export job if configured
          if (campaign.googleSheetId && queueService.addSheetsExportJob) {
            await queueService.addSheetsExportJob({
              leadId: lead.id,
              campaignId: campaign.id,
            });
          }
        }
      } catch (error) {
        strapi.log.warn('⚠️ Queue service not available:', error.message);
      }

      strapi.log.info(`New lead created: ${lead.id} for campaign: ${campaign.slug}`);

      return ctx.send({
        success: true,
        message: 'Lead created successfully',
        data: {
          id: lead.id,
          firstName: lead.firstName,
          email: lead.email,
          processingStatus: lead.aiProcessingStatus,
          campaign: {
            id: campaign.id,
            slug: campaign.slug,
            title: campaign.title,
          },
        },
      });

    } catch (error) {
      strapi.log.error('Error creating lead:', error);
      
      if (error instanceof ValidationError) {
        return ctx.badRequest(error.message);
      }
      
      throw error;
    }
  },

  /**
   * Get lead details
   * GET /api/leads/:id
   */
  async findOne(ctx) {
    const { id } = ctx.params;

    try {
      const lead = await strapi.entityService.findOne('api::lead.lead', id, {
        populate: {
          campaign: {
            select: ['id', 'slug', 'title', 'campaignType'],
          },
        },
      });

      if (!lead) {
        return ctx.notFound('Lead not found');
      }

      // Remove sensitive data for public API
      const publicLead = {
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        processingStatus: lead.aiProcessingStatus,
        emailSent: lead.emailSent,
        googleSheetsExported: lead.googleSheetsExported,
        hasResult: !!lead.aiResult,
        leadScore: lead.leadScore,
        leadQuality: lead.leadQuality,
        campaign: lead.campaign,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
      };

      return ctx.send({ data: publicLead });

    } catch (error) {
      strapi.log.error('Error finding lead:', error);
      throw error;
    }
  },

  /**
   * Get lead result (AI-generated content)
   * GET /api/leads/:id/result
   */
  async getResult(ctx) {
    const { id } = ctx.params;

    try {
      const lead = await strapi.entityService.findOne('api::lead.lead', id, {
        populate: {
          campaign: {
            select: ['id', 'slug', 'title'],
          },
        },
      });

      if (!lead) {
        return ctx.notFound('Lead not found');
      }

      if (lead.aiProcessingStatus !== 'completed') {
        return ctx.send({
          success: false,
          message: 'Result not ready yet',
          data: {
            processingStatus: lead.aiProcessingStatus,
            hasResult: false,
          },
        });
      }

      return ctx.send({
        success: true,
        message: 'Result retrieved successfully',
        data: {
          id: lead.id,
          firstName: lead.firstName,
          result: lead.aiResult,
          processingStatus: lead.aiProcessingStatus,
          aiProvider: lead.aiProvider,
          aiModel: lead.aiModel,
          campaign: lead.campaign,
        },
      });

    } catch (error) {
      strapi.log.error('Error getting lead result:', error);
      throw error;
    }
  },

  /**
   * Update lead information
   * PUT /api/leads/:id
   */
  async update(ctx) {
    const { id } = ctx.params;
    const { body } = ctx.request;

    try {
      // Validate update data
      const updateSchema = Joi.object({
        firstName: Joi.string().min(1).max(100).optional(),
        lastName: Joi.string().max(100).optional(),
        phone: Joi.string().pattern(/^[+]?[0-9\s\-\(\)]+$/).max(20).optional(),
        company: Joi.string().max(200).optional(),
        jobTitle: Joi.string().max(100).optional(),
        marketingOptIn: Joi.boolean().optional(),
        notes: Joi.string().max(2000).optional(),
        customFields: Joi.object().optional(),
        leadScore: Joi.number().integer().min(0).max(100).optional(),
        leadQuality: Joi.string().valid('hot', 'warm', 'cold', 'unqualified').optional(),
        followUpStatus: Joi.string().valid('pending', 'contacted', 'interested', 'not_interested', 'converted', 'lost').optional(),
        conversionValue: Joi.number().min(0).optional(),
        nextFollowUpAt: Joi.date().optional(),
        tags: Joi.array().items(Joi.string()).optional(),
      });

      const { error, value } = updateSchema.validate(body);
      if (error) {
        throw new ValidationError(`Validation error: ${error.details[0].message}`);
      }

      // Update lead
      const updatedLead = await strapi.entityService.update('api::lead.lead', id, {
        data: value,
      });

      if (!updatedLead) {
        return ctx.notFound('Lead not found');
      }

      strapi.log.info(`Lead updated: ${id}`);

      return ctx.send({
        success: true,
        message: 'Lead updated successfully',
        data: {
          id: updatedLead.id,
          firstName: updatedLead.firstName,
          lastName: updatedLead.lastName,
          email: updatedLead.email,
          leadScore: updatedLead.leadScore,
          leadQuality: updatedLead.leadQuality,
          followUpStatus: updatedLead.followUpStatus,
          updatedAt: updatedLead.updatedAt,
        },
      });

    } catch (error) {
      strapi.log.error('Error updating lead:', error);
      
      if (error instanceof ValidationError) {
        return ctx.badRequest(error.message);
      }
      
      throw error;
    }
  },

  /**
   * Reprocess lead with AI
   * POST /api/leads/:id/reprocess
   */
  async reprocess(ctx) {
    const { id } = ctx.params;

    try {
      const lead = await strapi.entityService.findOne('api::lead.lead', id, {
        populate: ['campaign'],
      });

      if (!lead) {
        return ctx.notFound('Lead not found');
      }

      // Reset processing status
      await strapi.entityService.update('api::lead.lead', id, {
        data: {
          aiProcessingStatus: 'pending',
          aiResult: null,
          retryCount: 0,
          processingErrors: [],
        },
      });

      // Queue AI processing job (optional)
      try {
        const queueService = strapi.service('api::queue.queue');
        if (queueService && queueService.addAIProcessingJob) {
          await queueService.addAIProcessingJob({
            leadId: lead.id,
            campaignId: lead.campaign.id,
            priority: 'high',
          });
        }
      } catch (error) {
        strapi.log.warn('⚠️ Queue service not available for reprocessing:', error.message);
      }

      strapi.log.info(`Lead reprocessing queued: ${id}`);

      return ctx.send({
        success: true,
        message: 'Lead reprocessing queued successfully',
        data: {
          id: lead.id,
          processingStatus: 'pending',
        },
      });

    } catch (error) {
      strapi.log.error('Error reprocessing lead:', error);
      throw error;
    }
  },

  /**
   * Check lead processing status (Frontend endpoint)
   * GET /api/leads/:id/status
   */
  async checkStatus(ctx) {
    const { id } = ctx.params;

    try {
      const lead = await strapi.entityService.findOne('api::lead.lead', id, {
        populate: {
          campaign: {
            select: ['id', 'slug', 'title', 'campaignType'],
          },
        },
      });

      if (!lead) {
        return ctx.notFound('Lead not found');
      }

      // Calculate estimated completion time
      const estimatedCompletion = this.calculateEstimatedCompletion(lead);

      const response = {
        success: true,
        data: {
          leadId: lead.id,
          processingStatus: lead.aiProcessingStatus,
          hasResult: !!lead.aiResult,
          emailSent: lead.emailSent,
          googleSheetsExported: lead.googleSheetsExported,
          estimatedCompletion,
          progress: this.calculateProgress(lead.aiProcessingStatus),
          campaign: lead.campaign,
          createdAt: lead.createdAt,
          updatedAt: lead.updatedAt,
        },
      };

      return ctx.send(response);

    } catch (error) {
      strapi.log.error(`❌ Error checking lead status ${id}:`, error);
      return ctx.internalServerError('Failed to check lead status');
    }
  },

  /**
   * Get lead result with formatted response (Frontend endpoint)
   * GET /api/leads/:id/result-formatted
   */
  async getFormattedResult(ctx) {
    const { id } = ctx.params;

    try {
      const lead = await strapi.entityService.findOne('api::lead.lead', id, {
        populate: {
          campaign: {
            select: ['id', 'slug', 'title', 'campaignType', 'emailTemplate'],
          },
        },
      });

      if (!lead) {
        return ctx.notFound('Lead not found');
      }

      if (lead.aiProcessingStatus !== 'completed' || !lead.aiResult) {
        return ctx.send({
          success: false,
          message: 'Result not ready yet',
          data: {
            processingStatus: lead.aiProcessingStatus,
            progress: this.calculateProgress(lead.aiProcessingStatus),
            estimatedCompletion: this.calculateEstimatedCompletion(lead),
          },
        });
      }

      // Format result for frontend display
      const formattedResult = {
        content: lead.aiResult,
        leadInfo: {
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          leadScore: lead.leadScore,
          leadQuality: lead.leadQuality,
        },
        campaign: {
          title: lead.campaign.title,
          type: lead.campaign.campaignType,
        },
        processing: {
          provider: lead.aiProvider,
          model: lead.aiModel,
          tokensUsed: lead.aiTokensUsed,
          processingTime: lead.aiProcessingTime,
          completedAt: lead.updatedAt,
        },
        metadata: {
          resultLength: lead.aiResult.length,
          wordCount: lead.aiResult.split(' ').length,
        },
      };

      return ctx.send({
        success: true,
        data: formattedResult,
      });

    } catch (error) {
      strapi.log.error(`❌ Error getting formatted result for lead ${id}:`, error);
      return ctx.internalServerError('Failed to get result');
    }
  },

  /**
   * Subscribe to lead updates via Server-Sent Events (Frontend endpoint)
   * GET /api/leads/:id/subscribe
   */
  async subscribe(ctx) {
    const { id } = ctx.params;

    try {
      // Check if lead exists
      const lead = await strapi.entityService.findOne('api::lead.lead', id);
      if (!lead) {
        return ctx.notFound('Lead not found');
      }

      // Setup SSE
      ctx.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });

      // Send initial status
      const initialData = {
        leadId: lead.id,
        processingStatus: lead.aiProcessingStatus,
        hasResult: !!lead.aiResult,
        timestamp: new Date().toISOString(),
      };

      ctx.body = `data: ${JSON.stringify(initialData)}\n\n`;

      // Set up periodic status checks (every 5 seconds)
      const intervalId = setInterval(async () => {
        try {
          const updatedLead = await strapi.entityService.findOne('api::lead.lead', id);
          if (updatedLead) {
            const statusData = {
              leadId: updatedLead.id,
              processingStatus: updatedLead.aiProcessingStatus,
              hasResult: !!updatedLead.aiResult,
              emailSent: updatedLead.emailSent,
              timestamp: new Date().toISOString(),
            };

            ctx.res.write(`data: ${JSON.stringify(statusData)}\n\n`);

            // Stop if processing is complete
            if (updatedLead.aiProcessingStatus === 'completed' || updatedLead.aiProcessingStatus === 'failed') {
              clearInterval(intervalId);
              ctx.res.end();
            }
          }
        } catch (error) {
          strapi.log.error('SSE update error:', error);
          clearInterval(intervalId);
          ctx.res.end();
        }
      }, 5000);

      // Clean up on client disconnect
      ctx.req.on('close', () => {
        clearInterval(intervalId);
      });

    } catch (error) {
      strapi.log.error(`❌ Error setting up SSE for lead ${id}:`, error);
      return ctx.internalServerError('Failed to subscribe to updates');
    }
  },

  /**
   * Calculate processing progress percentage
   * @param {string} status - Processing status
   * @returns {number} Progress percentage
   */
  calculateProgress(status) {
    const progressMap = {
      'pending': 10,
      'processing': 50,
      'completed': 100,
      'failed': 0,
      'retry': 25,
    };
    return progressMap[status] || 0;
  },

  /**
   * Calculate estimated completion time
   * @param {Object} lead - Lead object
   * @returns {string} Estimated completion time
   */
  calculateEstimatedCompletion(lead) {
    const now = new Date();
    const createdAt = new Date(lead.createdAt);
    const elapsed = now - createdAt;

    switch (lead.aiProcessingStatus) {
      case 'pending':
        return 'Processing will start shortly';
      case 'processing':
        return 'Estimated 1-3 minutes remaining';
      case 'completed':
        return 'Processing completed';
      case 'failed':
        return 'Processing failed';
      case 'retry':
        return 'Retrying... estimated 2-4 minutes';
      default:
        return 'Status unknown';
    }
  },

  /**
   * Process lead with specific AI provider
   * POST /api/leads/:id/process-ai
   */
  async processWithAI(ctx) {
    const { id } = ctx.params;
    const { body } = ctx.request;

    try {
      // Validate input
      const processSchema = Joi.object({
        provider: Joi.string().valid('openai', 'claude', 'gemini').optional(),
        options: Joi.object({
          speedPriority: Joi.boolean().optional(),
          qualityPriority: Joi.boolean().optional(),
          costPriority: Joi.boolean().optional(),
          temperature: Joi.number().min(0).max(2).optional(),
          maxTokens: Joi.number().min(100).max(8000).optional(),
        }).optional(),
      });

      const { error, value } = processSchema.validate(body);
      if (error) {
        return ctx.badRequest(`Validation error: ${error.details[0].message}`);
      }

      // Check if lead exists
      const lead = await strapi.entityService.findOne('api::lead.lead', id, {
        populate: ['campaign'],
      });

      if (!lead) {
        return ctx.notFound('Lead not found');
      }

      // Try to use campaign processing service
      try {
        const campaignProcessingService = strapi.service('api::campaign-processing.campaign-processing');
        
        if (!campaignProcessingService) {
          return ctx.badRequest('AI processing service not available');
        }

        // Process lead with specified options
        const result = await campaignProcessingService.processLead(id, {
          aiProvider: value.provider,
          ...value.options,
        });

        return ctx.send({
          success: true,
          message: 'AI processing completed successfully',
          data: {
            leadId: result.leadId,
            processingId: result.processingId,
            processingTime: result.processingTime,
            provider: result.result.analysis?.provider,
            model: result.result.analysis?.model,
            stagesCompleted: Object.keys(result.stages).length,
          },
        });
      } catch (serviceError) {
        // Fallback: just update the processing status
        await strapi.entityService.update('api::lead.lead', id, {
          data: {
            aiProcessingStatus: 'pending',
            aiProcessedAt: new Date(),
          },
        });

        return ctx.send({
          success: true,
          message: 'Lead queued for AI processing (service mode)',
          data: {
            leadId: id,
            status: 'queued',
            note: 'AI services not fully available, basic processing applied',
          },
        });
      }

    } catch (error) {
      strapi.log.error(`❌ AI processing failed for lead ${id}:`, error);
      return ctx.badRequest(error.message || 'AI processing failed');
    }
  },

  /**
   * Get AI processing analytics
   * GET /api/leads/ai-analytics
   */
  async getAIAnalytics(ctx) {
    try {
      // Get AI orchestrator status (optional)
      let aiStatus = { initialized: false, totalProviders: 0, defaultProvider: null, metrics: {} };
      try {
        const aiService = strapi.service('api::ai-orchestrator.ai-orchestrator');
        if (aiService) {
          aiStatus = aiService.getStatus();
        }
      } catch (error) {
        strapi.log.warn('AI orchestrator service not available:', error.message);
      }

      // Get campaign processing status (optional)
      let processingStatus = null;
      try {
        const campaignProcessingService = strapi.service('api::campaign-processing.campaign-processing');
        if (campaignProcessingService) {
          processingStatus = campaignProcessingService.getStatus();
        }
      } catch (error) {
        strapi.log.warn('Campaign processing service not available:', error.message);
      }

      // Get processing statistics from database
      const totalProcessed = await strapi.db.query('api::lead.lead').count({
        where: { aiProcessingStatus: { $ne: null } },
      });

      const processingStatusCounts = await strapi.db.query('api::lead.lead').findMany({
        select: ['aiProcessingStatus'],
        groupBy: ['aiProcessingStatus'],
      });

      const providerUsage = await strapi.db.query('api::lead.lead').findMany({
        select: ['aiProvider'],
        where: { aiProvider: { $ne: null } },
        groupBy: ['aiProvider'],
      });

      const recentProcessing = await strapi.db.query('api::lead.lead').findMany({
        select: ['id', 'firstName', 'aiProcessingStatus', 'aiProvider', 'aiProcessedAt'],
        where: { aiProcessedAt: { $ne: null } },
        orderBy: { aiProcessedAt: 'desc' },
        limit: 20,
      });

      const analytics = {
        overview: {
          totalProcessed,
          totalProviders: aiStatus.totalProviders,
          defaultProvider: aiStatus.defaultProvider,
          servicesInitialized: {
            aiOrchestrator: aiStatus.initialized,
            campaignProcessing: processingStatus?.initialized || false,
          },
        },
        processing: {
          statusCounts: processingStatusCounts.reduce((acc, curr) => {
            acc[curr.aiProcessingStatus] = curr.count || 1;
            return acc;
          }, {}),
          providerUsage: providerUsage.reduce((acc, curr) => {
            if (curr.aiProvider) {
              acc[curr.aiProvider] = (acc[curr.aiProvider] || 0) + (curr.count || 1);
            }
            return acc;
          }, {}),
          recentProcessing,
        },
        aiOrchestrator: {
          metrics: aiStatus.metrics,
          providers: Object.keys(aiStatus.providers).map(name => ({
            name,
            initialized: aiStatus.providers[name].initialized,
            health: aiStatus.providers[name].health,
            usage: aiStatus.providers[name].usage,
          })),
          cacheSize: aiStatus.cacheSize,
        },
        campaignProcessing: processingStatus || { initialized: false },
      };

      return ctx.send({
        success: true,
        data: analytics,
      });

    } catch (error) {
      strapi.log.error('Error getting AI analytics:', error);
      return ctx.internalServerError('Failed to get AI analytics');
    }
  },

  /**
   * Manage AI provider settings
   * POST /api/leads/ai-providers/manage
   */
  async manageAIProviders(ctx) {
    const { body } = ctx.request;

    try {
      // Validate input
      const manageSchema = Joi.object({
        action: Joi.string().valid('validate', 'clear_cache', 'reset_metrics', 'health_check').required(),
        provider: Joi.string().valid('openai', 'claude', 'gemini').optional(),
      });

      const { error, value } = manageSchema.validate(body);
      if (error) {
        return ctx.badRequest(`Validation error: ${error.details[0].message}`);
      }

      let result = {};

      try {
        const aiService = strapi.service('api::ai-orchestrator.ai-orchestrator');
        
        if (!aiService) {
          return ctx.badRequest('AI orchestrator service not available');
        }

        switch (value.action) {
          case 'validate':
            result.validProviders = await aiService.validateProviders();
            result.message = `Validated ${result.validProviders.length} providers`;
            break;

          case 'clear_cache':
            aiService.clearCache();
            result.message = 'AI cache cleared successfully';
            break;

          case 'reset_metrics':
            aiService.resetMetrics();
            result.message = 'AI metrics reset successfully';
            break;

          case 'health_check':
            const status = aiService.getStatus();
            result.health = {};
            
            for (const [name, provider] of Object.entries(status.providers || {})) {
              result.health[name] = {
                initialized: provider.initialized || false,
                healthy: provider.health?.status === 'healthy',
                reliability: provider.health?.reliability || 0,
                usage: provider.usage || {},
              };
            }
            result.message = 'Health check completed';
            break;

          default:
            return ctx.badRequest('Invalid action');
        }
      } catch (serviceError) {
        result.message = 'AI services not fully available';
        result.error = serviceError.message;
      }

      return ctx.send({
        success: true,
        message: result.message,
        data: result,
      });

    } catch (error) {
      strapi.log.error('Error managing AI providers:', error);
      return ctx.internalServerError('AI provider management failed');
    }
  },

  /**
   * Bulk process leads with AI
   * POST /api/leads/bulk-process
   */
  async bulkProcessWithAI(ctx) {
    const { body } = ctx.request;

    try {
      // Validate input
      const bulkSchema = Joi.object({
        leadIds: Joi.array().items(Joi.number().integer().positive()).min(1).max(50).required(),
        provider: Joi.string().valid('openai', 'claude', 'gemini').optional(),
        options: Joi.object({
          speedPriority: Joi.boolean().optional(),
          qualityPriority: Joi.boolean().optional(),
          costPriority: Joi.boolean().optional(),
          batchSize: Joi.number().min(1).max(10).default(5),
        }).optional(),
      });

      const { error, value } = bulkSchema.validate(body);
      if (error) {
        return ctx.badRequest(`Validation error: ${error.details[0].message}`);
      }

      const { leadIds, provider, options = {} } = value;
      const batchSize = options.batchSize || 5;

      // Verify all leads exist and need processing
      const leads = await strapi.db.query('api::lead.lead').findMany({
        where: { id: { $in: leadIds } },
        select: ['id', 'aiProcessingStatus'],
      });

      if (leads.length !== leadIds.length) {
        return ctx.badRequest('One or more leads not found');
      }

      // Queue processing jobs in batches (optional)
      let actuallyQueued = 0;
      const batches = [];
      
      try {
        const queueService = strapi.service('api::queue.queue');
        
        if (queueService && queueService.addAIProcessingJob) {
          for (let i = 0; i < leadIds.length; i += batchSize) {
            const batch = leadIds.slice(i, i + batchSize);
            batches.push(batch);

            // Queue each lead in the batch
            for (const leadId of batch) {
              await queueService.addAIProcessingJob({
                leadId,
                provider,
                options,
                priority: 'normal',
              }, { delay: i * 1000 }); // Stagger batches by 1 second
              actuallyQueued++;
            }
          }
        } else {
          // Fallback: just mark leads as pending
          await strapi.db.query('api::lead.lead').updateMany({
            where: { id: { $in: leadIds } },
            data: { aiProcessingStatus: 'pending' },
          });
          actuallyQueued = leadIds.length;
        }
      } catch (error) {
        strapi.log.warn('Queue service not available for bulk processing:', error.message);
        actuallyQueued = 0;
      }

      return ctx.send({
        success: true,
        message: `Bulk processing queued for ${actuallyQueued} of ${leadIds.length} leads`,
        data: {
          totalLeads: leadIds.length,
          actuallyQueued,
          batches: batches.length,
          batchSize,
          estimatedCompletionTime: actuallyQueued > 0 ? `${Math.ceil(actuallyQueued / batchSize) * 5} minutes` : 'N/A',
          queueServiceAvailable: actuallyQueued > 0,
        },
      });

    } catch (error) {
      strapi.log.error('Error in bulk AI processing:', error);
      return ctx.internalServerError('Bulk processing failed');
    }
  },

  /**
   * Get lead statistics (Admin endpoint)
   * GET /api/leads/stats
   */
  async getStats(ctx) {
    try {
      // Get lead statistics
      const totalLeads = await strapi.db.query('api::lead.lead').count();
      
      const leadsByStatus = await strapi.db.query('api::lead.lead').findMany({
        select: ['aiProcessingStatus'],
        groupBy: ['aiProcessingStatus'],
      });

      const leadsByQuality = await strapi.db.query('api::lead.lead').findMany({
        select: ['leadQuality'],
        groupBy: ['leadQuality'],
      });

      const recentLeads = await strapi.db.query('api::lead.lead').findMany({
        select: ['id', 'firstName', 'email', 'createdAt'],
        orderBy: { createdAt: 'desc' },
        limit: 10,
      });

      const stats = {
        totalLeads,
        leadsByStatus: leadsByStatus.reduce((acc, curr) => {
          acc[curr.aiProcessingStatus] = curr.count || 1;
          return acc;
        }, {}),
        leadsByQuality: leadsByQuality.reduce((acc, curr) => {
          acc[curr.leadQuality] = curr.count || 1;
          return acc;
        }, {}),
        recentLeads,
      };

      return ctx.send({ data: stats });

    } catch (error) {
      strapi.log.error('Error getting lead statistics:', error);
      throw error;
    }
  },

}));