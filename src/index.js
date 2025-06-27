'use strict';

module.exports = {
  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   */
  async bootstrap({ strapi }) {
    strapi.log.info('🎯 Bootstrapping GoAIX Platform...');
    
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