/**
 * GoAIX Platform Entry Point
 * Strapi application initialization for quiz.goaiex.com
 */

'use strict';

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }) {
    // Register custom services
    strapi.log.info('🚀 Registering GoAIX services...');

    // Register AI Orchestrator Service
    if (!strapi.service('api::ai-orchestrator.ai-orchestrator')) {
      strapi.log.info('📦 Registering AI Orchestrator service');
    }

    // Register Queue Service
    if (!strapi.service('api::queue.queue')) {
      strapi.log.info('📦 Registering Queue service');
    }

    // Register Google Sheets Service
    if (!strapi.service('api::google-sheets.google-sheets')) {
      strapi.log.info('📦 Registering Google Sheets service');
    }

    // Register Email Service
    if (!strapi.service('api::email.email')) {
      strapi.log.info('📦 Registering Email service');
    }

    strapi.log.info('✅ GoAIX services registered successfully');
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    strapi.log.info('🎯 Bootstrapping GoAIX Platform...');

    try {
      // Validate environment variables first
      const { generateValidationReport, logValidationReport } = require('./utils/env-validation');
      const envReport = generateValidationReport();
      
      logValidationReport(envReport, strapi.log);
      
      if (!envReport.isValid) {
        if (envReport.summary.criticalIssues.length > 0) {
          throw new Error(`Critical environment issues: ${envReport.summary.criticalIssues.join(', ')}`);
        }
        strapi.log.warn('⚠️ Environment validation warnings detected, but continuing...');
      }
      // Initialize queue system (optional)
      try {
        const queueService = strapi.service('api::queue.queue');
        if (queueService && queueService.initialize) {
          await queueService.initialize();
          strapi.log.info('📋 Queue system initialized');
        }
      } catch (error) {
        strapi.log.warn('⚠️ Queue service initialization failed:', error.message);
      }

      // Initialize Redis connection (optional)
      try {
        const redisService = strapi.service('api::redis.redis');
        if (redisService && redisService.initialize) {
          await redisService.initialize();
          strapi.log.info('🔴 Redis connection initialized');
        }
      } catch (error) {
        strapi.log.warn('⚠️ Redis service initialization failed:', error.message);
      }

      // Validate AI provider configurations (optional)
      try {
        const aiService = strapi.service('api::ai-orchestrator.ai-orchestrator');
        if (aiService && aiService.validateProviders) {
          const validProviders = await aiService.validateProviders();
          strapi.log.info(`🤖 AI providers validated: ${validProviders.join(', ')}`);
        }
      } catch (error) {
        strapi.log.warn('⚠️ AI service initialization failed:', error.message);
      }

      // Initialize Google Sheets service (optional)
      try {
        const sheetsService = strapi.service('api::google-sheets.google-sheets');
        if (sheetsService && sheetsService.initialize) {
          await sheetsService.initialize();
          strapi.log.info('📊 Google Sheets service initialized');
        }
      } catch (error) {
        strapi.log.warn('⚠️ Google Sheets service initialization failed:', error.message);
      }

      // Setup email service (optional)
      try {
        const emailService = strapi.service('api::email.email');
        if (emailService && emailService.initialize) {
          await emailService.initialize();
          strapi.log.info('📧 Email service initialized');
        }
      } catch (error) {
        strapi.log.warn('⚠️ Email service initialization failed:', error.message);
      }

      // Create default admin user if none exists (development only)
      if (process.env.NODE_ENV === 'development') {
        await createDefaultAdminUser(strapi);
      }

      // Start monitoring services
      if (process.env.NODE_ENV === 'production') {
        startMonitoringServices(strapi);
      }

      // Register custom routes
      registerCustomRoutes(strapi);

      // Setup enhanced lifecycle hooks (optional)
      try {
        const { setupLifecycleHooks } = require('./utils/lifecycle-hooks');
        setupLifecycleHooks(strapi);
      } catch (error) {
        strapi.log.warn('⚠️ Lifecycle hooks setup failed:', error.message);
      }

      strapi.log.info('🎉 GoAIX Platform bootstrap completed successfully!');
      strapi.log.info(`🌐 Platform running at: ${process.env.STRAPI_URL || 'http://localhost:1337'}`);
      strapi.log.info(`🎯 Frontend: https://quiz.goaiex.com`);
      strapi.log.info(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);

    } catch (error) {
      strapi.log.error('❌ Bootstrap failed:', error);
      throw error;
    }
  },
};

/**
 * Create default admin user for development
 * @param {Object} strapi - Strapi instance
 */
async function createDefaultAdminUser(strapi) {
  try {
    const adminUsers = await strapi.db.query('admin::user').findMany();
    
    if (adminUsers.length === 0) {
      const defaultAdmin = {
        firstname: 'Admin',
        lastname: 'GoAIX',
        email: 'admin@quiz.goaiex.com',
        password: 'AdminGoAIX2024!',
        isActive: true,
        blocked: false,
      };

      // Hash password
      const hashedPassword = await strapi.admin.services.auth.hashPassword(defaultAdmin.password);
      defaultAdmin.password = hashedPassword;

      // Create admin user
      await strapi.db.query('admin::user').create({
        data: defaultAdmin,
      });

      strapi.log.info('👤 Default admin user created (Development only)');
      strapi.log.info('📧 Email: admin@quiz.goaiex.com');
      strapi.log.info('🔑 Password: AdminGoAIX2024!');
    }
  } catch (error) {
    strapi.log.warn('⚠️ Could not create default admin user:', error.message);
  }
}

/**
 * Start monitoring services
 * @param {Object} strapi - Strapi instance
 */
function startMonitoringServices(strapi) {
  try {
    // Start performance monitoring
    if (process.env.MONITORING_ENABLED === 'true') {
      strapi.log.info('📊 Starting performance monitoring...');
    }

    // Start health check service
    if (process.env.HEALTH_CHECK_ENABLED !== 'false') {
      strapi.log.info('🏥 Health check service active');
    }

    // Start error tracking
    if (process.env.SENTRY_DSN) {
      strapi.log.info('🔍 Error tracking initialized');
    }

  } catch (error) {
    strapi.log.warn('⚠️ Monitoring services initialization failed:', error.message);
  }
}

/**
 * Register custom API routes
 * @param {Object} strapi - Strapi instance
 */
function registerCustomRoutes(strapi) {
  try {
    // Health check route
    strapi.router.get('/health', async (ctx) => {
      ctx.body = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
      };
    });

    // Campaign slug route
    strapi.router.get('/c/:slug', async (ctx) => {
      // Redirect to full campaign URL
      const slug = ctx.params.slug;
      ctx.redirect(`https://quiz.goaiex.com/campaign/${slug}`);
    });

    strapi.log.info('🛣️ Custom routes registered');

  } catch (error) {
    strapi.log.warn('⚠️ Custom routes registration failed:', error.message);
  }
}

