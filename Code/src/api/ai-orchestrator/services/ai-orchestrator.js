/**
 * AI Orchestrator Service Registration
 * Registers the AI Orchestrator as a Strapi service
 */

'use strict';

const { AIOrchestrator } = require('../../../services/ai/ai-orchestrator');

module.exports = ({ strapi }) => {
  // Create singleton instance of AI Orchestrator
  const aiOrchestrator = new AIOrchestrator(strapi);

  return {
    /**
     * Initialize the AI orchestrator
     */
    async initialize() {
      return await aiOrchestrator.initialize();
    },

    /**
     * Generate text using optimal provider
     */
    async generateText(prompt, options = {}) {
      return await aiOrchestrator.generateText(prompt, options);
    },

    /**
     * Generate structured response
     */
    async generateStructured(prompt, schema, options = {}) {
      return await aiOrchestrator.generateStructured(prompt, schema, options);
    },

    /**
     * Analyze image content
     */
    async analyzeImage(image, prompt, options = {}) {
      return await aiOrchestrator.analyzeImage(image, prompt, options);
    },

    /**
     * Validate all providers
     */
    async validateProviders() {
      return await aiOrchestrator.validateProviders();
    },

    /**
     * Get orchestrator status
     */
    getStatus() {
      return aiOrchestrator.getStatus();
    },

    /**
     * Clear cache
     */
    clearCache() {
      return aiOrchestrator.clearCache();
    },

    /**
     * Reset metrics
     */
    resetMetrics() {
      return aiOrchestrator.resetMetrics();
    },

    /**
     * Get direct access to orchestrator instance
     */
    getInstance() {
      return aiOrchestrator;
    },
  };
};