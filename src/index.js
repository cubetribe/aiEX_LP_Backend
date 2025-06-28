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
      
      // Store queue service in strapi for global access
      strapi.queueService = queueService;
      
      // Initialize queue service
      await queueService.initialize();
      strapi.log.info('✅ Queue Service initialized successfully');
    } catch (error) {
      strapi.log.error('❌ Error initializing Queue service:', error);
      strapi.log.warn('⚠️ Queue service disabled - continuing without background jobs');
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