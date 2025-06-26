/**
 * Queue Service
 * Bull Queue implementation with Redis for asynchronous job processing
 * GoAIX Platform - quiz.goaiex.com
 */

'use strict';

const Queue = require('bull');
const Redis = require('ioredis');
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');

/**
 * Queue Service for handling asynchronous jobs
 */
class QueueService {
  constructor(strapi) {
    this.strapi = strapi;
    this.queues = new Map();
    this.redisConfig = null;
    this.bullBoard = null;
    this.isInitialized = false;
    this.processors = new Map();
  }

  /**
   * Initialize Queue service with Redis connection
   */
  async initialize() {
    try {
      this.strapi.log.info('🔄 Initializing Queue service...');

      // Setup Redis configuration
      this.setupRedisConfig();

      // Test Redis connection
      await this.testRedisConnection();

      // Create queues
      this.createQueues();

      // Setup queue processors
      this.setupProcessors();

      // Setup Bull Board dashboard (development only)
      if (process.env.NODE_ENV === 'development' || process.env.QUEUE_DASHBOARD_ENABLED === 'true') {
        this.setupBullBoard();
      }

      // Setup queue event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      this.strapi.log.info('✅ Queue service initialized successfully');

    } catch (error) {
      this.strapi.log.error('❌ Failed to initialize Queue service:', error);
      throw new Error(`Queue service initialization failed: ${error.message}`);
    }
  }

  /**
   * Setup Redis configuration
   */
  setupRedisConfig() {
    this.redisConfig = {
      host: process.env.QUEUE_REDIS_HOST || process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.QUEUE_REDIS_PORT || process.env.REDIS_PORT || '6379'),
      password: process.env.QUEUE_REDIS_PASSWORD || process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.QUEUE_REDIS_DB || '1'),
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxLoadingTimeout: 1000,
      lazyConnect: true,
    };

    this.strapi.log.info(`🔴 Redis config: ${this.redisConfig.host}:${this.redisConfig.port}/${this.redisConfig.db}`);
  }

  /**
   * Test Redis connection
   */
  async testRedisConnection() {
    const testRedis = new Redis(this.redisConfig);
    
    try {
      await testRedis.ping();
      this.strapi.log.info('✅ Redis connection test successful');
    } catch (error) {
      throw new Error(`Redis connection failed: ${error.message}`);
    } finally {
      testRedis.disconnect();
    }
  }

  /**
   * Create all queues
   */
  createQueues() {
    const queueConfigs = [
      {
        name: 'ai-processing',
        options: {
          defaultJobOptions: {
            removeOnComplete: 50,
            removeOnFail: 100,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        },
      },
      {
        name: 'sheets-export',
        options: {
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 5,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
          },
        },
      },
      {
        name: 'email-sending',
        options: {
          defaultJobOptions: {
            removeOnComplete: 200,
            removeOnFail: 100,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          },
        },
      },
      {
        name: 'analytics',
        options: {
          defaultJobOptions: {
            removeOnComplete: 10,
            removeOnFail: 25,
            attempts: 2,
            backoff: {
              type: 'fixed',
              delay: 10000,
            },
          },
        },
      },
    ];

    queueConfigs.forEach(config => {
      const queue = new Queue(config.name, {
        redis: this.redisConfig,
        ...config.options,
      });

      this.queues.set(config.name, queue);
      this.strapi.log.info(`📋 Created queue: ${config.name}`);
    });
  }

  /**
   * Setup queue processors
   */
  setupProcessors() {
    // AI Processing Queue
    this.queues.get('ai-processing').process('process-lead', 
      parseInt(process.env.QUEUE_CONCURRENCY || '5'), 
      this.processAIJob.bind(this)
    );

    // Google Sheets Export Queue
    this.queues.get('sheets-export').process('export-lead', 
      parseInt(process.env.QUEUE_CONCURRENCY || '5'), 
      this.processSheetsExportJob.bind(this)
    );

    // Email Sending Queue
    this.queues.get('email-sending').process('send-email', 
      parseInt(process.env.QUEUE_CONCURRENCY || '3'), 
      this.processEmailJob.bind(this)
    );

    // Analytics Queue
    this.queues.get('analytics').process('track-event', 
      parseInt(process.env.QUEUE_CONCURRENCY || '2'), 
      this.processAnalyticsJob.bind(this)
    );

    this.strapi.log.info('🔧 Queue processors setup completed');
  }

  /**
   * Setup Bull Board dashboard
   */
  setupBullBoard() {
    try {
      const serverAdapter = new ExpressAdapter();
      
      const queueAdapters = Array.from(this.queues.values()).map(queue => new BullAdapter(queue));
      
      createBullBoard({
        queues: queueAdapters,
        serverAdapter,
      });

      serverAdapter.setBasePath('/admin/queues');

      // Add to Strapi router (if available)
      if (this.strapi.server && this.strapi.server.app) {
        this.strapi.server.app.use('/admin/queues', serverAdapter.getRouter());
        this.strapi.log.info('📊 Bull Board dashboard available at /admin/queues');
      }

    } catch (error) {
      this.strapi.log.warn('⚠️ Failed to setup Bull Board dashboard:', error.message);
    }
  }

  /**
   * Setup queue event listeners
   */
  setupEventListeners() {
    this.queues.forEach((queue, name) => {
      queue.on('completed', (job, result) => {
        this.strapi.log.info(`✅ Job completed in ${name}: ${job.id}`);
      });

      queue.on('failed', (job, error) => {
        this.strapi.log.error(`❌ Job failed in ${name}: ${job.id} - ${error.message}`);
      });

      queue.on('stalled', (job) => {
        this.strapi.log.warn(`⚠️ Job stalled in ${name}: ${job.id}`);
      });

      queue.on('progress', (job, progress) => {
        this.strapi.log.debug(`📈 Job progress in ${name}: ${job.id} - ${progress}%`);
      });
    });
  }

  /**
   * Add AI processing job
   * @param {Object} data - Job data
   * @param {Object} options - Job options
   * @returns {Object} Job instance
   */
  async addAIProcessingJob(data, options = {}) {
    try {
      this.ensureInitialized();

      const defaultOptions = {
        priority: options.priority === 'high' ? 1 : 
                 options.priority === 'low' ? 10 : 5,
        delay: options.delay || 0,
        attempts: options.attempts || 3,
      };

      const job = await this.queues.get('ai-processing').add('process-lead', data, {
        ...defaultOptions,
        ...options,
      });

      this.strapi.log.info(`📤 AI processing job queued: ${job.id} for lead: ${data.leadId}`);
      return job;

    } catch (error) {
      this.strapi.log.error('❌ Failed to queue AI processing job:', error);
      throw error;
    }
  }

  /**
   * Add Google Sheets export job
   * @param {Object} data - Job data
   * @param {Object} options - Job options
   * @returns {Object} Job instance
   */
  async addSheetsExportJob(data, options = {}) {
    try {
      this.ensureInitialized();

      const defaultOptions = {
        priority: 5,
        delay: options.delay || 1000, // Small delay to allow lead processing
        attempts: 5,
      };

      const job = await this.queues.get('sheets-export').add('export-lead', data, {
        ...defaultOptions,
        ...options,
      });

      this.strapi.log.info(`📊 Sheets export job queued: ${job.id} for lead: ${data.leadId}`);
      return job;

    } catch (error) {
      this.strapi.log.error('❌ Failed to queue sheets export job:', error);
      throw error;
    }
  }

  /**
   * Add email sending job
   * @param {Object} data - Job data
   * @param {Object} options - Job options
   * @returns {Object} Job instance
   */
  async addEmailJob(data, options = {}) {
    try {
      this.ensureInitialized();

      const defaultOptions = {
        priority: 3,
        delay: options.delay || 5000, // Delay to ensure AI processing is complete
        attempts: 3,
      };

      const job = await this.queues.get('email-sending').add('send-email', data, {
        ...defaultOptions,
        ...options,
      });

      this.strapi.log.info(`📧 Email job queued: ${job.id} for lead: ${data.leadId}`);
      return job;

    } catch (error) {
      this.strapi.log.error('❌ Failed to queue email job:', error);
      throw error;
    }
  }

  /**
   * Add analytics tracking job
   * @param {Object} data - Job data
   * @param {Object} options - Job options
   * @returns {Object} Job instance
   */
  async addAnalyticsJob(data, options = {}) {
    try {
      this.ensureInitialized();

      const defaultOptions = {
        priority: 10,
        delay: options.delay || 0,
        attempts: 2,
      };

      const job = await this.queues.get('analytics').add('track-event', data, {
        ...defaultOptions,
        ...options,
      });

      this.strapi.log.debug(`📈 Analytics job queued: ${job.id}`);
      return job;

    } catch (error) {
      this.strapi.log.warn('⚠️ Failed to queue analytics job:', error);
      // Don't throw error for analytics failures
    }
  }

  /**
   * Process AI job
   * @param {Object} job - Bull job instance
   */
  async processAIJob(job) {
    try {
      const { leadId, campaignId } = job.data;
      
      this.strapi.log.info(`🤖 Processing AI job for lead: ${leadId}`);
      
      // Update job progress
      await job.progress(10);

      // Get lead with campaign data
      const lead = await this.strapi.entityService.findOne('api::lead.lead', leadId, {
        populate: ['campaign'],
      });

      if (!lead) {
        throw new Error(`Lead ${leadId} not found`);
      }

      await job.progress(25);

      // Process lead with AI service
      const leadService = this.strapi.service('api::lead.lead');
      const result = await leadService.processLeadWithAI(leadId);

      await job.progress(75);

      // Queue email job if processing was successful
      if (result.success && result.aiResult) {
        await this.addEmailJob({
          leadId: leadId,
          type: 'result-notification',
        });
      }

      await job.progress(100);

      this.strapi.log.info(`✅ AI processing completed for lead: ${leadId}`);
      
      return {
        success: true,
        leadId: leadId,
        result: result.aiResult,
      };

    } catch (error) {
      this.strapi.log.error(`❌ AI processing failed for lead ${job.data.leadId}:`, error);
      throw error;
    }
  }

  /**
   * Process Google Sheets export job
   * @param {Object} job - Bull job instance
   */
  async processSheetsExportJob(job) {
    try {
      const { leadId, campaignId } = job.data;
      
      this.strapi.log.info(`📊 Processing Sheets export job for lead: ${leadId}`);
      
      await job.progress(10);

      // Get lead with campaign data
      const lead = await this.strapi.entityService.findOne('api::lead.lead', leadId, {
        populate: ['campaign'],
      });

      if (!lead) {
        throw new Error(`Lead ${leadId} not found`);
      }

      if (!lead.campaign || !lead.campaign.googleSheetId) {
        throw new Error(`Campaign ${campaignId} does not have Google Sheet configured`);
      }

      await job.progress(30);

      // Export to Google Sheets
      const GoogleSheetsService = require('./google-sheets.service');
      const sheetsService = new GoogleSheetsService(this.strapi);
      
      if (!sheetsService.isInitialized) {
        await sheetsService.initialize();
      }

      await job.progress(50);

      const result = await sheetsService.exportLead(lead);

      await job.progress(100);

      this.strapi.log.info(`✅ Sheets export completed for lead: ${leadId}`);
      
      return {
        success: true,
        leadId: leadId,
        rowNumber: result.rowNumber,
        spreadsheetId: result.spreadsheetId,
      };

    } catch (error) {
      this.strapi.log.error(`❌ Sheets export failed for lead ${job.data.leadId}:`, error);
      throw error;
    }
  }

  /**
   * Process email sending job
   * @param {Object} job - Bull job instance
   */
  async processEmailJob(job) {
    try {
      const { leadId, type } = job.data;
      
      this.strapi.log.info(`📧 Processing email job for lead: ${leadId}, type: ${type}`);
      
      await job.progress(10);

      // Get lead data
      const lead = await this.strapi.entityService.findOne('api::lead.lead', leadId, {
        populate: ['campaign'],
      });

      if (!lead) {
        throw new Error(`Lead ${leadId} not found`);
      }

      await job.progress(25);

      // Send email using email service
      const emailService = this.strapi.service('api::email.email');
      let result;

      switch (type) {
        case 'result-notification':
          result = await emailService.sendResultEmail(leadId);
          break;
        case 'welcome':
          result = await emailService.sendWelcomeEmail(leadId);
          break;
        case 'follow-up':
          result = await emailService.sendFollowUpEmail(leadId);
          break;
        default:
          throw new Error(`Unknown email type: ${type}`);
      }

      await job.progress(100);

      this.strapi.log.info(`✅ Email sent successfully for lead: ${leadId}`);
      
      return {
        success: true,
        leadId: leadId,
        emailType: type,
        messageId: result.messageId,
      };

    } catch (error) {
      this.strapi.log.error(`❌ Email sending failed for lead ${job.data.leadId}:`, error);
      throw error;
    }
  }

  /**
   * Process analytics tracking job
   * @param {Object} job - Bull job instance
   */
  async processAnalyticsJob(job) {
    try {
      const { event, data } = job.data;
      
      this.strapi.log.debug(`📈 Processing analytics job for event: ${event}`);
      
      // Track event (implementation depends on analytics provider)
      // This is a placeholder for analytics integration
      
      this.strapi.log.debug(`✅ Analytics event tracked: ${event}`);
      
      return {
        success: true,
        event: event,
        timestamp: new Date(),
      };

    } catch (error) {
      this.strapi.log.warn(`⚠️ Analytics tracking failed for event ${job.data.event}:`, error);
      // Don't throw error for analytics failures
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get queue statistics
   * @param {string} queueName - Name of the queue
   * @returns {Object} Queue statistics
   */
  async getQueueStats(queueName) {
    try {
      this.ensureInitialized();

      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed(),
      ]);

      return {
        name: queueName,
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total: waiting.length + active.length + completed.length + failed.length + delayed.length,
      };

    } catch (error) {
      this.strapi.log.error(`❌ Failed to get queue stats for ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Get all queue statistics
   * @returns {Object} All queue statistics
   */
  async getAllQueueStats() {
    try {
      this.ensureInitialized();

      const stats = {};
      
      for (const queueName of this.queues.keys()) {
        stats[queueName] = await this.getQueueStats(queueName);
      }

      return stats;

    } catch (error) {
      this.strapi.log.error('❌ Failed to get all queue stats:', error);
      throw error;
    }
  }

  /**
   * Pause queue
   * @param {string} queueName - Name of the queue to pause
   */
  async pauseQueue(queueName) {
    try {
      this.ensureInitialized();

      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      await queue.pause();
      this.strapi.log.info(`⏸️ Queue paused: ${queueName}`);

    } catch (error) {
      this.strapi.log.error(`❌ Failed to pause queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Resume queue
   * @param {string} queueName - Name of the queue to resume
   */
  async resumeQueue(queueName) {
    try {
      this.ensureInitialized();

      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      await queue.resume();
      this.strapi.log.info(`▶️ Queue resumed: ${queueName}`);

    } catch (error) {
      this.strapi.log.error(`❌ Failed to resume queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Clean queue
   * @param {string} queueName - Name of the queue to clean
   * @param {number} grace - Grace period in milliseconds
   * @param {string} type - Type of jobs to clean (completed, failed, etc.)
   */
  async cleanQueue(queueName, grace = 3600000, type = 'completed') {
    try {
      this.ensureInitialized();

      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const result = await queue.clean(grace, type);
      this.strapi.log.info(`🧹 Cleaned ${result.length} ${type} jobs from ${queueName}`);

      return result;

    } catch (error) {
      this.strapi.log.error(`❌ Failed to clean queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Close all queues gracefully
   */
  async close() {
    try {
      this.strapi.log.info('🔄 Closing all queues...');

      const closePromises = Array.from(this.queues.values()).map(queue => queue.close());
      await Promise.all(closePromises);

      this.queues.clear();
      this.isInitialized = false;

      this.strapi.log.info('✅ All queues closed successfully');

    } catch (error) {
      this.strapi.log.error('❌ Failed to close queues:', error);
      throw error;
    }
  }

  /**
   * Ensure service is initialized
   */
  ensureInitialized() {
    if (!this.isInitialized) {
      throw new Error('Queue service is not initialized. Call initialize() first.');
    }
  }
}

module.exports = QueueService;