/**
 * OpenAI Provider Implementation
 * Implements the BaseAIProvider for OpenAI GPT models including GPT-4o
 */

'use strict';

const { BaseAIProvider } = require('./base-provider');
const OpenAI = require('openai');

/**
 * OpenAI provider implementation
 * Supports GPT-3.5, GPT-4, GPT-4o and other OpenAI models
 */
class OpenAIProvider extends BaseAIProvider {
  constructor(config) {
    super(config);
    
    this.client = null;
    this.models = {
      'gpt-4o': {
        maxTokens: 128000,
        costPer1kTokens: 0.005,
        supportsVision: true,
        supportsStructured: true,
      },
      'gpt-4o-mini': {
        maxTokens: 128000,
        costPer1kTokens: 0.00015,
        supportsVision: true,
        supportsStructured: true,
      },
      'gpt-4-turbo': {
        maxTokens: 128000,
        costPer1kTokens: 0.01,
        supportsVision: true,
        supportsStructured: true,
      },
      'gpt-4': {
        maxTokens: 8192,
        costPer1kTokens: 0.03,
        supportsVision: false,
        supportsStructured: false,
      },
      'gpt-3.5-turbo': {
        maxTokens: 16385,
        costPer1kTokens: 0.0015,
        supportsVision: false,
        supportsStructured: false,
      },
    };

    // Set default model to GPT-4o if not specified
    if (!this.config.model) {
      this.config.model = 'gpt-4o';
    }
  }

  /**
   * Validate OpenAI configuration
   */
  validateConfig() {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    if (this.config.model && !this.models[this.config.model]) {
      throw new Error(`Unsupported OpenAI model: ${this.config.model}`);
    }

    if (!this.config.organization && process.env.NODE_ENV === 'production') {
      console.warn('OpenAI organization ID not set - recommended for production');
    }
  }

  /**
   * Initialize OpenAI client
   */
  async initialize() {
    try {
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
        organization: this.config.organization,
        timeout: this.config.timeout || 30000,
        maxRetries: this.config.maxRetries || 3,
      });

      // Test connection with a minimal request
      await this.client.models.list();
      
      this.isInitialized = true;
      
      // Initialize rate limiter if configured
      if (this.config.rateLimit) {
        this.setupRateLimiter();
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to initialize OpenAI provider: ${error.message}`);
    }
  }

  /**
   * Generate text response using OpenAI
   */
  async generateText(prompt, options = {}) {
    this.validateInput(prompt, options);
    
    if (!this.isInitialized) {
      throw new Error('OpenAI provider not initialized');
    }

    const model = options.model || this.config.model;
    const startTime = Date.now();

    try {
      // Prepare messages for chat completion
      const messages = this.prepareMessages(prompt, options);
      
      const requestParams = {
        model,
        messages,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 1,
        frequency_penalty: options.frequencyPenalty || 0,
        presence_penalty: options.presencePenalty || 0,
        stop: options.stop || null,
        stream: false,
      };

      // Add user identifier for tracking
      if (options.user) {
        requestParams.user = options.user;
      }

      const response = await this.client.chat.completions.create(requestParams);
      
      const processingTime = Date.now() - startTime;
      const usage = response.usage;

      // Update usage statistics
      this.updateUsageStats({
        totalTokens: usage.total_tokens,
        cost: this.calculateCost(model, usage.total_tokens),
      });

      return this.normalizeResponse(response.choices[0].message.content, {
        model,
        requestId: response.id,
        processingTime,
        finishReason: response.choices[0].finish_reason,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        cost: this.calculateCost(model, usage.total_tokens),
      });

    } catch (error) {
      return this.handleError(error, () => this.generateText(prompt, options));
    }
  }

  /**
   * Generate structured response using OpenAI
   */
  async generateStructured(prompt, schema, options = {}) {
    if (!this.supportsStructuredOutput(options.model)) {
      throw new Error(`Model ${options.model || this.config.model} does not support structured output`);
    }

    this.validateInput(prompt, options);
    
    const model = options.model || this.config.model;
    const startTime = Date.now();

    try {
      const messages = this.prepareMessages(prompt, options);
      
      const requestParams = {
        model,
        messages,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.3, // Lower temperature for structured output
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'structured_response',
            schema: schema,
            strict: true,
          },
        },
      };

      const response = await this.client.chat.completions.create(requestParams);
      
      const processingTime = Date.now() - startTime;
      const usage = response.usage;

      // Parse JSON response
      const structuredContent = JSON.parse(response.choices[0].message.content);

      this.updateUsageStats({
        totalTokens: usage.total_tokens,
        cost: this.calculateCost(model, usage.total_tokens),
      });

      return this.normalizeResponse(structuredContent, {
        model,
        requestId: response.id,
        processingTime,
        finishReason: response.choices[0].finish_reason,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        cost: this.calculateCost(model, usage.total_tokens),
        structured: true,
      });

    } catch (error) {
      return this.handleError(error, () => this.generateStructured(prompt, schema, options));
    }
  }

  /**
   * Analyze image using OpenAI vision models
   */
  async analyzeImage(image, prompt, options = {}) {
    const model = options.model || 'gpt-4o';
    
    if (!this.supportsMultimodal(model)) {
      throw new Error(`Model ${model} does not support image analysis`);
    }

    const startTime = Date.now();

    try {
      const imageContent = this.prepareImageContent(image);
      
      const messages = [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt,
          },
          {
            type: 'image_url',
            image_url: {
              url: imageContent,
              detail: options.detail || 'auto',
            },
          },
        ],
      }];

      const requestParams = {
        model,
        messages,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
      };

      const response = await this.client.chat.completions.create(requestParams);
      
      const processingTime = Date.now() - startTime;
      const usage = response.usage;

      this.updateUsageStats({
        totalTokens: usage.total_tokens,
        cost: this.calculateCost(model, usage.total_tokens),
      });

      return this.normalizeResponse(response.choices[0].message.content, {
        model,
        requestId: response.id,
        processingTime,
        finishReason: response.choices[0].finish_reason,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        cost: this.calculateCost(model, usage.total_tokens),
        multimodal: true,
      });

    } catch (error) {
      return this.handleError(error, () => this.analyzeImage(image, prompt, options));
    }
  }

  /**
   * Check if model supports multimodal input
   */
  supportsMultimodal(model = null) {
    const targetModel = model || this.config.model;
    return this.models[targetModel]?.supportsVision || false;
  }

  /**
   * Check if model supports structured output
   */
  supportsStructuredOutput(model = null) {
    const targetModel = model || this.config.model;
    return this.models[targetModel]?.supportsStructured || false;
  }

  /**
   * Get available OpenAI models
   */
  getAvailableModels() {
    return Object.keys(this.models);
  }

  /**
   * Get cost per token for current model
   */
  getCostPerToken() {
    return this.models[this.config.model]?.costPer1kTokens / 1000 || 0.001;
  }

  /**
   * Get maximum tokens for current model
   */
  getMaxTokens() {
    return this.models[this.config.model]?.maxTokens || 4096;
  }

  /**
   * Calculate cost for token usage
   */
  calculateCost(model, tokens) {
    const costPer1k = this.models[model]?.costPer1kTokens || 0.001;
    return (tokens / 1000) * costPer1k;
  }

  /**
   * Prepare messages array for OpenAI API
   */
  prepareMessages(prompt, options = {}) {
    const messages = [];

    // Add system message if provided
    if (options.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }

    // Add conversation history if provided
    if (options.history && Array.isArray(options.history)) {
      messages.push(...options.history);
    }

    // Add main prompt
    messages.push({
      role: 'user',
      content: prompt,
    });

    return messages;
  }

  /**
   * Prepare image content for vision API
   */
  prepareImageContent(image) {
    if (typeof image === 'string') {
      // Assume it's a URL or base64 string
      if (image.startsWith('http')) {
        return image;
      } else if (image.startsWith('data:image')) {
        return image;
      } else {
        // Assume base64 without prefix
        return `data:image/jpeg;base64,${image}`;
      }
    } else if (Buffer.isBuffer(image)) {
      // Convert buffer to base64
      return `data:image/jpeg;base64,${image.toString('base64')}`;
    } else {
      throw new Error('Invalid image format. Provide URL, base64 string, or Buffer');
    }
  }

  /**
   * Setup rate limiter for OpenAI API
   */
  setupRateLimiter() {
    // OpenAI rate limits vary by model and tier
    // This is a simplified implementation
    this.rateLimiter = {
      remaining: 100,
      limit: 100,
      resetTime: Date.now() + 60000, // Reset in 1 minute
    };
  }

  /**
   * Enhanced error handling for OpenAI specific errors
   */
  normalizeError(error) {
    const normalized = super.normalizeError(error);

    // Add OpenAI-specific error handling
    if (error.type === 'insufficient_quota') {
      normalized.message = 'OpenAI API quota exceeded. Please check your billing.';
      normalized.code = 'QUOTA_EXCEEDED';
    } else if (error.type === 'invalid_request_error') {
      normalized.message = `Invalid request: ${error.message}`;
      normalized.code = 'INVALID_REQUEST';
    } else if (error.type === 'rate_limit_exceeded') {
      normalized.message = 'OpenAI API rate limit exceeded. Please try again later.';
      normalized.code = 'RATE_LIMIT_EXCEEDED';
    }

    return normalized;
  }

  /**
   * Get OpenAI-specific provider information
   */
  getInfo() {
    const baseInfo = super.getInfo();
    return {
      ...baseInfo,
      models: this.models,
      defaultModel: this.config.model,
      organization: this.config.organization,
      apiVersion: 'v1',
    };
  }
}

module.exports = { OpenAIProvider };