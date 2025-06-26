/**
 * AI Provider Base Interface
 * Abstract base class for all AI providers in the GoAIX platform
 * Provides standardized interface for OpenAI, Claude, and Gemini providers
 */

'use strict';

/**
 * Abstract base class for AI providers
 * Defines the standard interface that all providers must implement
 */
class BaseAIProvider {
  /**
   * Initialize the AI provider
   * @param {Object} config - Provider-specific configuration
   * @param {string} config.apiKey - API key for the provider
   * @param {string} config.model - Default model to use
   * @param {Object} config.options - Additional provider options
   */
  constructor(config) {
    if (this.constructor === BaseAIProvider) {
      throw new Error('BaseAIProvider is abstract and cannot be instantiated directly');
    }

    this.config = config;
    this.name = this.constructor.name.toLowerCase().replace('provider', '');
    this.isInitialized = false;
    this.rateLimiter = null;
    this.tokenUsage = {
      totalTokens: 0,
      totalCost: 0,
      requestCount: 0,
    };

    // Validate required configuration
    this.validateConfig();
  }

  /**
   * Validate provider configuration
   * Must be implemented by each provider
   */
  validateConfig() {
    throw new Error('validateConfig() must be implemented by provider');
  }

  /**
   * Initialize the provider
   * Setup connections, rate limiters, etc.
   */
  async initialize() {
    throw new Error('initialize() must be implemented by provider');
  }

  /**
   * Generate text response from AI
   * @param {string} prompt - The input prompt
   * @param {Object} options - Generation options
   * @param {string} options.model - Model to use (optional, uses default)
   * @param {number} options.maxTokens - Maximum tokens to generate
   * @param {number} options.temperature - Temperature for generation
   * @param {Array} options.stop - Stop sequences
   * @returns {Promise<Object>} Generated response object
   */
  async generateText(prompt, options = {}) {
    throw new Error('generateText() must be implemented by provider');
  }

  /**
   * Generate structured response from AI
   * @param {string} prompt - The input prompt
   * @param {Object} schema - JSON schema for structured output
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Structured response object
   */
  async generateStructured(prompt, schema, options = {}) {
    throw new Error('generateStructured() must be implemented by provider');
  }

  /**
   * Analyze image with AI (for multimodal providers)
   * @param {string|Buffer} image - Image data or URL
   * @param {string} prompt - Analysis prompt
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeImage(image, prompt, options = {}) {
    throw new Error('analyzeImage() must be implemented by provider');
  }

  /**
   * Check if provider supports multimodal input
   * @returns {boolean} True if supports images
   */
  supportsMultimodal() {
    return false;
  }

  /**
   * Check if provider supports structured output
   * @returns {boolean} True if supports structured output
   */
  supportsStructuredOutput() {
    return false;
  }

  /**
   * Get available models for this provider
   * @returns {Array<string>} List of available model names
   */
  getAvailableModels() {
    throw new Error('getAvailableModels() must be implemented by provider');
  }

  /**
   * Get current rate limit status
   * @returns {Object} Rate limit information
   */
  getRateLimitStatus() {
    if (!this.rateLimiter) {
      return { unlimited: true };
    }

    return {
      unlimited: false,
      remaining: this.rateLimiter.remaining,
      resetTime: this.rateLimiter.resetTime,
      limit: this.rateLimiter.limit,
    };
  }

  /**
   * Get token usage statistics
   * @returns {Object} Usage statistics
   */
  getUsageStats() {
    return {
      ...this.tokenUsage,
      provider: this.name,
      costPerToken: this.getCostPerToken(),
    };
  }

  /**
   * Get cost per token for the provider
   * @returns {number} Cost per token in USD
   */
  getCostPerToken() {
    throw new Error('getCostPerToken() must be implemented by provider');
  }

  /**
   * Estimate cost for a request
   * @param {string} prompt - Input prompt
   * @param {Object} options - Request options
   * @returns {Promise<number>} Estimated cost in USD
   */
  async estimateCost(prompt, options = {}) {
    const estimatedTokens = this.estimateTokens(prompt);
    const costPerToken = this.getCostPerToken();
    return estimatedTokens * costPerToken;
  }

  /**
   * Estimate token count for text
   * @param {string} text - Text to estimate
   * @returns {number} Estimated token count
   */
  estimateTokens(text) {
    // Basic estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Handle API errors with retry logic
   * @param {Error} error - The error to handle
   * @param {Function} retryFn - Function to retry
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise<any>} Result of successful retry or throws error
   */
  async handleError(error, retryFn, maxRetries = 3) {
    const isRetryable = this.isRetryableError(error);
    
    if (!isRetryable || maxRetries <= 0) {
      throw this.normalizeError(error);
    }

    // Exponential backoff
    const delay = Math.pow(2, 4 - maxRetries) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));

    return this.handleError(error, retryFn, maxRetries - 1);
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} True if error is retryable
   */
  isRetryableError(error) {
    const retryableCodes = [429, 502, 503, 504];
    return retryableCodes.includes(error.status || error.statusCode);
  }

  /**
   * Normalize error response
   * @param {Error} error - Raw error from provider
   * @returns {Object} Normalized error object
   */
  normalizeError(error) {
    return {
      provider: this.name,
      type: error.name || 'AIProviderError',
      message: error.message || 'Unknown error occurred',
      status: error.status || error.statusCode || 500,
      code: error.code || 'UNKNOWN_ERROR',
      originalError: error,
    };
  }

  /**
   * Normalize successful response
   * @param {any} response - Raw response from provider
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Normalized response object
   */
  normalizeResponse(response, metadata = {}) {
    return {
      success: true,
      provider: this.name,
      model: metadata.model || this.config.model,
      content: response.content || response.text || response,
      usage: {
        promptTokens: metadata.promptTokens || 0,
        completionTokens: metadata.completionTokens || 0,
        totalTokens: metadata.totalTokens || 0,
        cost: metadata.cost || 0,
      },
      metadata: {
        requestId: metadata.requestId,
        processingTime: metadata.processingTime,
        finishReason: metadata.finishReason,
        ...metadata,
      },
    };
  }

  /**
   * Update token usage statistics
   * @param {Object} usage - Usage data from API response
   */
  updateUsageStats(usage) {
    this.tokenUsage.totalTokens += usage.totalTokens || 0;
    this.tokenUsage.totalCost += usage.cost || 0;
    this.tokenUsage.requestCount += 1;
  }

  /**
   * Validate input parameters
   * @param {string} prompt - Input prompt
   * @param {Object} options - Request options
   */
  validateInput(prompt, options = {}) {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Prompt must be a non-empty string');
    }

    if (prompt.length > this.getMaxPromptLength()) {
      throw new Error(`Prompt exceeds maximum length of ${this.getMaxPromptLength()} characters`);
    }

    if (options.maxTokens && options.maxTokens > this.getMaxTokens()) {
      throw new Error(`maxTokens exceeds provider limit of ${this.getMaxTokens()}`);
    }

    if (options.temperature && (options.temperature < 0 || options.temperature > 2)) {
      throw new Error('Temperature must be between 0 and 2');
    }
  }

  /**
   * Get maximum prompt length for provider
   * @returns {number} Maximum prompt length in characters
   */
  getMaxPromptLength() {
    return 32000; // Default limit
  }

  /**
   * Get maximum tokens for provider
   * @returns {number} Maximum tokens
   */
  getMaxTokens() {
    return 4096; // Default limit
  }

  /**
   * Check provider health
   * @returns {Promise<Object>} Health status
   */
  async checkHealth() {
    try {
      const start = Date.now();
      await this.generateText('Hello', { maxTokens: 5 });
      const responseTime = Date.now() - start;

      return {
        healthy: true,
        provider: this.name,
        responseTime,
        rateLimit: this.getRateLimitStatus(),
        usage: this.getUsageStats(),
      };
    } catch (error) {
      return {
        healthy: false,
        provider: this.name,
        error: this.normalizeError(error),
      };
    }
  }

  /**
   * Get provider information
   * @returns {Object} Provider information
   */
  getInfo() {
    return {
      name: this.name,
      initialized: this.isInitialized,
      model: this.config.model,
      supportsMultimodal: this.supportsMultimodal(),
      supportsStructuredOutput: this.supportsStructuredOutput(),
      availableModels: this.getAvailableModels(),
      maxTokens: this.getMaxTokens(),
      maxPromptLength: this.getMaxPromptLength(),
      costPerToken: this.getCostPerToken(),
    };
  }
}

module.exports = { BaseAIProvider };