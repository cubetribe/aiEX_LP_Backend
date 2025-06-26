/**
 * Queue Service - Strapi Service Wrapper
 * Wraps the Queue service class for Strapi integration
 */

'use strict';

const QueueService = require('../../../services/queue.service');

module.exports = ({ strapi }) => {
  let queueServiceInstance = null;

  return {
    /**
     * Get or create queue service instance
     */
    getInstance() {
      if (!queueServiceInstance) {
        queueServiceInstance = new QueueService(strapi);
      }
      return queueServiceInstance;
    },

    /**
     * Initialize queue service
     */
    async initialize() {
      const instance = this.getInstance();
      if (!instance.isInitialized) {
        await instance.initialize();
      }
      return instance;
    },

    /**
     * Add AI processing job
     */
    async addAIProcessingJob(data, options = {}) {
      const instance = this.getInstance();
      return instance.addAIProcessingJob(data, options);
    },

    /**
     * Add Google Sheets export job
     */
    async addSheetsExportJob(data, options = {}) {
      const instance = this.getInstance();
      return instance.addSheetsExportJob(data, options);
    },

    /**
     * Add email sending job
     */
    async addEmailJob(data, options = {}) {
      const instance = this.getInstance();
      return instance.addEmailJob(data, options);
    },

    /**
     * Add analytics tracking job
     */
    async addAnalyticsJob(data, options = {}) {
      const instance = this.getInstance();
      return instance.addAnalyticsJob(data, options);
    },

    /**
     * Get queue statistics
     */
    async getQueueStats(queueName) {
      const instance = this.getInstance();
      return instance.getQueueStats(queueName);
    },

    /**
     * Get all queue statistics
     */
    async getAllQueueStats() {
      const instance = this.getInstance();
      return instance.getAllQueueStats();
    },

    /**
     * Pause queue
     */
    async pauseQueue(queueName) {
      const instance = this.getInstance();
      return instance.pauseQueue(queueName);
    },

    /**
     * Resume queue
     */
    async resumeQueue(queueName) {
      const instance = this.getInstance();
      return instance.resumeQueue(queueName);
    },

    /**
     * Clean queue
     */
    async cleanQueue(queueName, grace, type) {
      const instance = this.getInstance();
      return instance.cleanQueue(queueName, grace, type);
    },

    /**
     * Close all queues
     */
    async close() {
      const instance = this.getInstance();
      return instance.close();
    },
  };
};