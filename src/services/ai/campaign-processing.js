/**
 * Campaign Processing Service
 * Orchestrates the complete lead-to-AI processing pipeline
 * Handles campaign-specific AI analysis, response generation, and result formatting
 */

'use strict';

const { PromptTemplateEngine } = require('./prompt-template-engine');

/**
 * Campaign Processing Service
 * Main service for processing leads through AI analysis pipeline
 */
class CampaignProcessingService {
  constructor(strapi) {
    this.strapi = strapi;
    this.templateEngine = new PromptTemplateEngine(strapi);
    this.isInitialized = false;
    
    // Processing configuration
    this.config = {
      maxRetries: parseInt(process.env.AI_PROCESSING_MAX_RETRIES) || 3,
      timeout: parseInt(process.env.AI_PROCESSING_TIMEOUT) || 60000,
      enableParallelProcessing: process.env.AI_ENABLE_PARALLEL === 'true',
      cacheResults: process.env.AI_CACHE_RESULTS !== 'false',
      validateOutputs: process.env.AI_VALIDATE_OUTPUTS !== 'false',
    };

    // Processing stages
    this.stages = {
      INITIALIZATION: 'initialization',
      ANALYSIS: 'analysis',
      RESPONSE_GENERATION: 'response_generation',
      EMAIL_GENERATION: 'email_generation',
      VALIDATION: 'validation',
      FINALIZATION: 'finalization',
    };

    // Processing metrics
    this.metrics = {
      totalProcessed: 0,
      successfulProcessing: 0,
      failedProcessing: 0,
      averageProcessingTime: 0,
      stageMetrics: {},
    };

    // Initialize stage metrics
    for (const stage of Object.values(this.stages)) {
      this.metrics.stageMetrics[stage] = {
        processed: 0,
        successful: 0,
        failed: 0,
        averageTime: 0,
      };
    }
  }

  /**
   * Initialize the campaign processing service
   */
  async initialize() {
    try {
      this.strapi.log.info('🔄 Initializing Campaign Processing Service...');

      // Initialize template engine
      await this.templateEngine.initialize();

      this.isInitialized = true;
      this.strapi.log.info('✅ Campaign Processing Service initialized');
      
      return true;
    } catch (error) {
      this.strapi.log.error('❌ Failed to initialize Campaign Processing Service:', error);
      throw error;
    }
  }

  /**
   * Process a lead through the complete AI pipeline
   */
  async processLead(leadId, options = {}) {
    this.validateInitialization();
    
    const startTime = Date.now();
    const processingId = `${leadId}-${Date.now()}`;
    
    this.strapi.log.info(`🚀 Starting lead processing for ID: ${leadId}`);
    
    try {
      // Increment metrics
      this.metrics.totalProcessed++;

      // Initialize processing context
      const context = await this.initializeProcessingContext(leadId, processingId, options);

      // Execute processing pipeline
      const result = await this.executeProcessingPipeline(context);

      // Finalize and save results
      await this.finalizeProcessing(context, result);

      const processingTime = Date.now() - startTime;
      this.updateMetrics(true, processingTime);

      this.strapi.log.info(`✅ Lead processing completed for ID: ${leadId} in ${processingTime}ms`);
      
      return {
        success: true,
        leadId,
        processingId,
        result,
        processingTime,
        stages: context.stageResults,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateMetrics(false, processingTime);
      
      this.strapi.log.error(`❌ Lead processing failed for ID: ${leadId}:`, error);
      
      // Save error state
      await this.handleProcessingError(leadId, processingId, error, startTime);
      
      throw error;
    }
  }

  /**
   * Initialize processing context with lead and campaign data
   */
  async initializeProcessingContext(leadId, processingId, options) {
    const stageStartTime = Date.now();
    
    try {
      this.strapi.log.debug(`📋 Initializing context for lead: ${leadId}`);

      // Fetch lead data
      const lead = await strapi.entityService.findOne('api::lead.lead', leadId, {
        populate: ['campaign'],
      });

      if (!lead) {
        throw new Error(`Lead with ID ${leadId} not found`);
      }

      if (!lead.campaign) {
        throw new Error(`Campaign not found for lead ${leadId}`);
      }

      // Create processing context
      const context = {
        processingId,
        leadId,
        lead,
        campaign: lead.campaign,
        options,
        startTime: Date.now(),
        stageResults: {},
        currentStage: this.stages.INITIALIZATION,
        errors: [],
        warnings: [],
        aiProvider: options.aiProvider,
        processingConfig: {
          ...this.config,
          ...options.config,
        },
      };

      // Update lead status
      await this.updateLeadStatus(leadId, 'processing', {
        processingId,
        currentStage: this.stages.INITIALIZATION,
        startedAt: new Date().toISOString(),
      });

      const stageTime = Date.now() - stageStartTime;
      this.updateStageMetrics(this.stages.INITIALIZATION, true, stageTime);

      return context;

    } catch (error) {
      const stageTime = Date.now() - stageStartTime;
      this.updateStageMetrics(this.stages.INITIALIZATION, false, stageTime);
      throw error;
    }
  }

  /**
   * Execute the complete processing pipeline
   */
  async executeProcessingPipeline(context) {
    const pipeline = [
      { stage: this.stages.ANALYSIS, method: this.executeAnalysisStage.bind(this) },
      { stage: this.stages.RESPONSE_GENERATION, method: this.executeResponseStage.bind(this) },
      { stage: this.stages.EMAIL_GENERATION, method: this.executeEmailStage.bind(this) },
      { stage: this.stages.VALIDATION, method: this.executeValidationStage.bind(this) },
    ];

    const results = {};

    for (const { stage, method } of pipeline) {
      context.currentStage = stage;
      
      await this.updateLeadStatus(context.leadId, 'processing', {
        processingId: context.processingId,
        currentStage: stage,
        progress: this.calculateProgress(stage),
      });

      this.strapi.log.debug(`🔄 Executing stage: ${stage} for lead: ${context.leadId}`);
      
      try {
        const stageResult = await method(context);
        results[stage] = stageResult;
        context.stageResults[stage] = stageResult;
        
        this.strapi.log.debug(`✅ Stage ${stage} completed successfully`);
        
      } catch (error) {
        this.strapi.log.error(`❌ Stage ${stage} failed:`, error);
        context.errors.push({ stage, error: error.message, timestamp: new Date().toISOString() });
        
        // Decide whether to continue or abort
        if (this.isCriticalStage(stage)) {
          throw error;
        } else {
          context.warnings.push({ stage, message: `Non-critical stage failed: ${error.message}` });
        }
      }
    }

    return results;
  }

  /**
   * Execute AI analysis stage
   */
  async executeAnalysisStage(context) {
    const stageStartTime = Date.now();
    
    try {
      this.strapi.log.debug(`🧠 Starting AI analysis for lead: ${context.leadId}`);

      // Generate analysis prompt
      const prompt = await this.templateEngine.generateLeadAnalysisPrompt(
        context.lead,
        context.campaign,
        context.options
      );

      // Get AI orchestrator service
      const aiService = strapi.service('api::ai-orchestrator.ai-orchestrator');

      // Determine if structured output is needed
      const requiresStructured = this.requiresStructuredOutput(context.campaign);
      
      let analysisResult;
      
      if (requiresStructured) {
        const schema = this.getAnalysisSchema(context.campaign);
        analysisResult = await aiService.generateStructured(prompt, schema, {
          provider: context.aiProvider,
          maxTokens: 2000,
          temperature: 0.3,
        });
      } else {
        analysisResult = await aiService.generateText(prompt, {
          provider: context.aiProvider,
          maxTokens: 2000,
          temperature: 0.7,
        });
      }

      // Parse and validate analysis result
      const parsedResult = this.parseAnalysisResult(analysisResult, context.campaign);

      const stageTime = Date.now() - stageStartTime;
      this.updateStageMetrics(this.stages.ANALYSIS, true, stageTime);

      return {
        prompt,
        rawResult: analysisResult,
        parsedResult,
        provider: analysisResult.provider,
        model: analysisResult.model,
        usage: analysisResult.usage,
        processingTime: stageTime,
      };

    } catch (error) {
      const stageTime = Date.now() - stageStartTime;
      this.updateStageMetrics(this.stages.ANALYSIS, false, stageTime);
      throw error;
    }
  }

  /**
   * Execute response generation stage
   */
  async executeResponseStage(context) {
    const stageStartTime = Date.now();
    
    try {
      this.strapi.log.debug(`📝 Starting response generation for lead: ${context.leadId}`);

      const analysisResult = context.stageResults[this.stages.ANALYSIS];
      if (!analysisResult) {
        throw new Error('Analysis stage result not available');
      }

      // Generate response prompt
      const prompt = await this.templateEngine.generateCampaignResponsePrompt(
        context.lead,
        context.campaign,
        analysisResult.parsedResult,
        context.options
      );

      // Get AI service
      const aiService = strapi.service('api::ai-orchestrator.ai-orchestrator');

      // Generate personalized response
      const responseResult = await aiService.generateText(prompt, {
        provider: context.aiProvider,
        maxTokens: 1500,
        temperature: 0.7,
      });

      // Format response for frontend display
      const formattedResponse = this.formatResponseForDisplay(
        responseResult.content,
        context.lead,
        context.campaign
      );

      const stageTime = Date.now() - stageStartTime;
      this.updateStageMetrics(this.stages.RESPONSE_GENERATION, true, stageTime);

      return {
        prompt,
        rawResponse: responseResult,
        formattedContent: formattedResponse,
        provider: responseResult.provider,
        model: responseResult.model,
        usage: responseResult.usage,
        processingTime: stageTime,
      };

    } catch (error) {
      const stageTime = Date.now() - stageStartTime;
      this.updateStageMetrics(this.stages.RESPONSE_GENERATION, false, stageTime);
      throw error;
    }
  }

  /**
   * Execute email generation stage
   */
  async executeEmailStage(context) {
    const stageStartTime = Date.now();
    
    try {
      this.strapi.log.debug(`📧 Starting email generation for lead: ${context.leadId}`);

      const responseResult = context.stageResults[this.stages.RESPONSE_GENERATION];
      if (!responseResult) {
        throw new Error('Response generation stage result not available');
      }

      // Generate email prompt
      const prompt = await this.templateEngine.generateEmailPrompt(
        context.lead,
        context.campaign,
        responseResult.formattedContent,
        context.options
      );

      // Get AI service
      const aiService = strapi.service('api::ai-orchestrator.ai-orchestrator');

      // Generate email content
      const emailResult = await aiService.generateText(prompt, {
        provider: context.aiProvider,
        maxTokens: 1000,
        temperature: 0.6,
      });

      // Parse email content
      const parsedEmail = this.parseEmailContent(emailResult.content);

      const stageTime = Date.now() - stageStartTime;
      this.updateStageMetrics(this.stages.EMAIL_GENERATION, true, stageTime);

      return {
        prompt,
        rawEmail: emailResult,
        parsedEmail,
        provider: emailResult.provider,
        model: emailResult.model,
        usage: emailResult.usage,
        processingTime: stageTime,
      };

    } catch (error) {
      const stageTime = Date.now() - stageStartTime;
      this.updateStageMetrics(this.stages.EMAIL_GENERATION, false, stageTime);
      
      // Email generation is not critical - create fallback
      return this.createFallbackEmail(context);
    }
  }

  /**
   * Execute validation stage
   */
  async executeValidationStage(context) {
    const stageStartTime = Date.now();
    
    try {
      this.strapi.log.debug(`✅ Starting validation for lead: ${context.leadId}`);

      const validationResults = {
        analysisValidation: this.validateAnalysisResult(context.stageResults[this.stages.ANALYSIS]),
        responseValidation: this.validateResponseResult(context.stageResults[this.stages.RESPONSE_GENERATION]),
        emailValidation: this.validateEmailResult(context.stageResults[this.stages.EMAIL_GENERATION]),
        overallQuality: 0,
        issues: [],
        warnings: [],
      };

      // Calculate overall quality score
      validationResults.overallQuality = this.calculateQualityScore(validationResults);

      // Check for critical issues
      if (validationResults.overallQuality < 0.6) {
        context.warnings.push({
          stage: this.stages.VALIDATION,
          message: `Low quality score: ${validationResults.overallQuality}`,
        });
      }

      const stageTime = Date.now() - stageStartTime;
      this.updateStageMetrics(this.stages.VALIDATION, true, stageTime);

      return validationResults;

    } catch (error) {
      const stageTime = Date.now() - stageStartTime;
      this.updateStageMetrics(this.stages.VALIDATION, false, stageTime);
      throw error;
    }
  }

  /**
   * Finalize processing and save results
   */
  async finalizeProcessing(context, results) {
    const stageStartTime = Date.now();
    
    try {
      this.strapi.log.debug(`🏁 Finalizing processing for lead: ${context.leadId}`);

      // Prepare final result object
      const finalResult = {
        leadId: context.leadId,
        processingId: context.processingId,
        campaignId: context.campaign.id,
        campaignType: context.campaign.campaignType,
        
        // Analysis results
        analysis: results[this.stages.ANALYSIS]?.parsedResult,
        analysisMetadata: {
          provider: results[this.stages.ANALYSIS]?.provider,
          model: results[this.stages.ANALYSIS]?.model,
          usage: results[this.stages.ANALYSIS]?.usage,
        },
        
        // Generated content
        content: results[this.stages.RESPONSE_GENERATION]?.formattedContent,
        contentMetadata: {
          provider: results[this.stages.RESPONSE_GENERATION]?.provider,
          model: results[this.stages.RESPONSE_GENERATION]?.model,
          usage: results[this.stages.RESPONSE_GENERATION]?.usage,
        },
        
        // Email content
        email: results[this.stages.EMAIL_GENERATION]?.parsedEmail,
        emailMetadata: {
          provider: results[this.stages.EMAIL_GENERATION]?.provider,
          model: results[this.stages.EMAIL_GENERATION]?.model,
          usage: results[this.stages.EMAIL_GENERATION]?.usage,
        },
        
        // Validation and quality
        validation: results[this.stages.VALIDATION],
        
        // Processing metadata
        processedAt: new Date().toISOString(),
        processingTime: Date.now() - context.startTime,
        stageMetrics: Object.keys(results).map(stage => ({
          stage,
          processingTime: results[stage].processingTime,
          success: true,
        })),
        errors: context.errors,
        warnings: context.warnings,
      };

      // Update lead with results
      await strapi.entityService.update('api::lead.lead', context.leadId, {
        data: {
          aiProcessingStatus: 'completed',
          aiResult: finalResult.content,
          aiAnalysis: finalResult.analysis,
          aiEmailContent: finalResult.email?.body,
          aiProcessedAt: new Date(),
          aiProvider: finalResult.analysisMetadata.provider,
          aiModel: finalResult.analysisMetadata.model,
          processingMetadata: {
            processingId: context.processingId,
            totalTime: finalResult.processingTime,
            qualityScore: finalResult.validation?.overallQuality,
            stageCount: Object.keys(results).length,
          },
        },
      });

      // Queue follow-up tasks
      await this.queueFollowUpTasks(context, finalResult);

      const stageTime = Date.now() - stageStartTime;
      this.updateStageMetrics(this.stages.FINALIZATION, true, stageTime);

      return finalResult;

    } catch (error) {
      const stageTime = Date.now() - stageStartTime;
      this.updateStageMetrics(this.stages.FINALIZATION, false, stageTime);
      throw error;
    }
  }

  /**
   * Queue follow-up tasks after processing
   */
  async queueFollowUpTasks(context, result) {
    try {
      const queueService = strapi.service('api::queue.queue');

      // Queue email sending if email was generated
      if (result.email && context.campaign.config?.sendResultEmail !== false) {
        await queueService.addEmailJob({
          type: 'ai_result_email',
          leadId: context.leadId,
          emailContent: result.email,
          priority: 'normal',
        });
      }

      // Queue Google Sheets export
      if (context.campaign.googleSheetId) {
        await queueService.addSheetsExportJob({
          leadId: context.leadId,
          campaignId: context.campaign.id,
          includeAIResults: true,
          priority: 'low',
        });
      }

      // Queue analytics tracking
      await queueService.addAnalyticsJob({
        type: 'ai_processing_completed',
        leadId: context.leadId,
        campaignId: context.campaign.id,
        processingTime: result.processingTime,
        qualityScore: result.validation?.overallQuality,
        provider: result.analysisMetadata.provider,
      });

    } catch (error) {
      this.strapi.log.warn('Failed to queue follow-up tasks:', error);
      // Don't throw - follow-up tasks are not critical
    }
  }

  /**
   * Handle processing errors
   */
  async handleProcessingError(leadId, processingId, error, startTime) {
    try {
      const processingTime = Date.now() - startTime;

      // Update lead status
      await strapi.entityService.update('api::lead.lead', leadId, {
        data: {
          aiProcessingStatus: 'failed',
          aiProcessingError: error.message,
          aiProcessedAt: new Date(),
          processingMetadata: {
            processingId,
            totalTime: processingTime,
            failed: true,
            errorMessage: error.message,
          },
        },
      });

      // Queue retry if appropriate
      if (this.shouldRetry(error)) {
        const queueService = strapi.service('api::queue.queue');
        await queueService.addAIProcessingJob({
          leadId,
          retry: true,
          previousError: error.message,
          delay: 30000, // 30 second delay before retry
        });
      }

    } catch (updateError) {
      this.strapi.log.error('Failed to handle processing error:', updateError);
    }
  }

  /**
   * Utility methods
   */
  requiresStructuredOutput(campaign) {
    const structuredTypes = ['quiz', 'textOnly'];
    return structuredTypes.includes(campaign.campaignType) || 
           campaign.config?.requireStructuredOutput === true;
  }

  getAnalysisSchema(campaign) {
    // Return campaign-specific schema or default
    return campaign.config?.analysisSchema || {
      type: 'object',
      properties: {
        leadScore: { type: 'number', minimum: 0, maximum: 100 },
        qualification: { type: 'string', enum: ['hot', 'warm', 'cold', 'unqualified'] },
        insights: { type: 'array', items: { type: 'string' } },
        recommendations: { type: 'array', items: { type: 'string' } },
        summary: { type: 'string' },
      },
      required: ['leadScore', 'qualification', 'summary'],
    };
  }

  parseAnalysisResult(result, campaign) {
    if (typeof result.content === 'object') {
      return result.content; // Already structured
    }

    // Try to parse JSON if it's a string
    try {
      return JSON.parse(result.content);
    } catch (error) {
      // Fallback to text analysis
      return {
        leadScore: this.extractLeadScore(result.content),
        qualification: this.extractQualification(result.content),
        summary: result.content,
        insights: this.extractInsights(result.content),
      };
    }
  }

  formatResponseForDisplay(content, lead, campaign) {
    return {
      content,
      leadInfo: {
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
      },
      campaign: {
        title: campaign.title,
        type: campaign.campaignType,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  parseEmailContent(content) {
    // Simple email parsing - could be enhanced
    const lines = content.split('\n').filter(line => line.trim());
    
    let subject = 'Your GoAIX Results';
    let body = content;
    
    // Look for subject line
    const subjectMatch = content.match(/Subject:\s*(.+)/i);
    if (subjectMatch) {
      subject = subjectMatch[1].trim();
      body = content.replace(/Subject:\s*.+\n?/i, '').trim();
    }

    return {
      subject,
      body,
      recipient: null, // Will be set when sending
      sender: {
        name: 'GoAIX Team',
        email: 'noreply@quiz.goaiex.com',
      },
    };
  }

  createFallbackEmail(context) {
    return {
      parsedEmail: {
        subject: `Your ${context.campaign.title} Results`,
        body: `Dear ${context.lead.firstName},\n\nThank you for completing our ${context.campaign.title}. We're currently processing your results and will send them to you shortly.\n\nBest regards,\nThe GoAIX Team`,
        sender: {
          name: 'GoAIX Team',
          email: 'noreply@quiz.goaiex.com',
        },
      },
      fallback: true,
      processingTime: 0,
    };
  }

  // Validation methods
  validateAnalysisResult(result) {
    if (!result || !result.parsedResult) return { valid: false, score: 0 };
    
    const analysis = result.parsedResult;
    let score = 0;
    
    if (analysis.leadScore !== undefined) score += 0.3;
    if (analysis.qualification) score += 0.2;
    if (analysis.summary) score += 0.3;
    if (analysis.insights && analysis.insights.length > 0) score += 0.2;
    
    return { valid: score > 0.6, score };
  }

  validateResponseResult(result) {
    if (!result || !result.formattedContent) return { valid: false, score: 0 };
    
    const content = result.formattedContent.content;
    let score = 0;
    
    if (content && content.length > 100) score += 0.5;
    if (content && content.includes('personalized')) score += 0.2;
    if (result.usage && result.usage.totalTokens > 0) score += 0.3;
    
    return { valid: score > 0.5, score };
  }

  validateEmailResult(result) {
    if (!result || !result.parsedEmail) return { valid: false, score: 0 };
    
    const email = result.parsedEmail;
    let score = 0;
    
    if (email.subject && email.subject.length > 5) score += 0.3;
    if (email.body && email.body.length > 50) score += 0.5;
    if (email.sender) score += 0.2;
    
    return { valid: score > 0.6, score };
  }

  calculateQualityScore(validation) {
    const weights = { analysis: 0.4, response: 0.4, email: 0.2 };
    
    return (
      validation.analysisValidation.score * weights.analysis +
      validation.responseValidation.score * weights.response +
      validation.emailValidation.score * weights.email
    );
  }

  // Helper extraction methods (simplified)
  extractLeadScore(content) {
    const match = content.match(/score[:\s]*(\d+)/i);
    return match ? parseInt(match[1]) : 50;
  }

  extractQualification(content) {
    const qualifications = ['hot', 'warm', 'cold', 'unqualified'];
    for (const qual of qualifications) {
      if (content.toLowerCase().includes(qual)) return qual;
    }
    return 'warm';
  }

  extractInsights(content) {
    // Simple insight extraction
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 3).map(s => s.trim());
  }

  // Status and metrics methods
  calculateProgress(stage) {
    const stageOrder = Object.values(this.stages);
    const currentIndex = stageOrder.indexOf(stage);
    return Math.round((currentIndex / stageOrder.length) * 100);
  }

  isCriticalStage(stage) {
    return [this.stages.ANALYSIS, this.stages.RESPONSE_GENERATION].includes(stage);
  }

  shouldRetry(error) {
    const retryableErrors = ['timeout', 'rate_limit', 'temporary_failure'];
    return retryableErrors.some(type => error.message.toLowerCase().includes(type));
  }

  async updateLeadStatus(leadId, status, metadata = {}) {
    try {
      await strapi.entityService.update('api::lead.lead', leadId, {
        data: {
          aiProcessingStatus: status,
          aiProcessingMetadata: metadata,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.strapi.log.warn('Failed to update lead status:', error);
    }
  }

  updateMetrics(success, processingTime) {
    if (success) {
      this.metrics.successfulProcessing++;
    } else {
      this.metrics.failedProcessing++;
    }
    
    // Update average processing time
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime * (this.metrics.totalProcessed - 1) + processingTime) 
      / this.metrics.totalProcessed;
  }

  updateStageMetrics(stage, success, processingTime) {
    const stageMetrics = this.metrics.stageMetrics[stage];
    
    stageMetrics.processed++;
    if (success) {
      stageMetrics.successful++;
    } else {
      stageMetrics.failed++;
    }
    
    stageMetrics.averageTime = 
      (stageMetrics.averageTime * (stageMetrics.processed - 1) + processingTime) 
      / stageMetrics.processed;
  }

  validateInitialization() {
    if (!this.isInitialized) {
      throw new Error('Campaign Processing Service not initialized');
    }
  }

  /**
   * Get service status and metrics
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      configuration: this.config,
      stages: Object.values(this.stages),
      metrics: this.metrics,
      templateEngine: this.templateEngine.getStatus(),
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalProcessed: 0,
      successfulProcessing: 0,
      failedProcessing: 0,
      averageProcessingTime: 0,
      stageMetrics: {},
    };

    for (const stage of Object.values(this.stages)) {
      this.metrics.stageMetrics[stage] = {
        processed: 0,
        successful: 0,
        failed: 0,
        averageTime: 0,
      };
    }
  }
}

module.exports = { CampaignProcessingService };