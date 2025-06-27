'use strict';

module.exports = {
  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   */
  async bootstrap({ strapi }) {
    strapi.log.info('🎯 Bootstrapping GoAIX Platform in MINIMAL MODE...');
    strapi.log.warn('⚠️ All custom services and initializers are disabled for debugging.');
    strapi.log.info('🎉 GoAIX Platform bootstrap completed successfully!');
  },
};