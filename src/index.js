'use strict';

module.exports = {
  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   */
  async bootstrap({ strapi }) {
    strapi.log.info('🎯 Bootstrapping GoAIX Platform...');
    
    // Initialize AI Services
    try {
      const aiProviderService = require('./services/ai-provider.service');
      strapi.log.info('✅ AI Provider Service initialized');
    } catch (error) {
      strapi.log.error('❌ Error initializing AI services:', error);
    }

    // Initialize Email Service
    try {
      const emailService = require('./services/email.service');
      // Force initialization by calling getStatus
      const emailStatus = emailService.getStatus();
      strapi.log.info('✅ Email Service initialized:', emailStatus);
    } catch (error) {
      strapi.log.error('❌ Error initializing Email service:', error);
    }

    // Initialize Queue Service
    try {
      const QueueService = require('./services/queue.service');
      const queueService = new QueueService(strapi);
      
      // Initialize queue service BEFORE storing it
      await queueService.initialize();
      
      // Only store queue service in strapi if initialization was successful
      strapi.queueService = queueService;
      strapi.log.info('✅ Queue Service initialized and attached successfully');
      strapi.log.info(`🔍 Queue Service status: isInitialized=${queueService.isInitialized}, queues=${queueService.queues.size}`);
    } catch (error) {
      strapi.log.error('❌ Error initializing Queue service:', error);
      strapi.log.warn('⚠️ Queue service disabled - continuing without background jobs');
      // Ensure queueService is not attached if initialization failed
      strapi.queueService = null;
    }
    
    // Register custom routes
    try {
      const globalRoutes = require('./routes');
      globalRoutes.forEach(route => {
        strapi.server.routes([{
          method: route.method,
          path: route.path,
          handler: route.handler,
          config: route.config
        }]);
      });
      strapi.log.info('✅ Custom routes registered successfully');
    } catch (error) {
      strapi.log.error('❌ Error registering custom routes:', error);
    }
    
    strapi.log.info('🎉 GoAIX Platform bootstrap completed successfully!');
  },
};