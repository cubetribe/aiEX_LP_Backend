/**
 * Claude Provider Implementation
 * Implements the BaseAIProvider for Anthropic Claude models with intelligent model selection
 */

'use strict';

const { BaseAIProvider } = require('./base-provider');
const Anthropic = require('@anthropic-ai/sdk');

/**
 * Claude provider implementation
 * Supports Claude 3.5 Sonnet, Claude 3 Opus, and Claude 3 Haiku with intelligent model selection
 */
class ClaudeProvider extends BaseAIProvider {
  constructor(config) {
    super(config);
    
    this.client = null;
    this.models = {
      'claude-3-5-sonnet-20241022': {
        maxTokens: 200000,
        maxOutputTokens: 8192,
        costPer1MTokensInput: 3.00,
        costPer1MTokensOutput: 15.00,
        supportsVision: true,
        supportsStructured: true,
        contextWindow: 200000,
        tier: 'advanced',
      },
      'claude-3-5-haiku-20241022': {
        maxTokens: 200000,
        maxOutputTokens: 8192,
        costPer1MTokensInput: 0.25,
        costPer1MTokensOutput: 1.25,
        supportsVision: true,
        supportsStructured: true,
        contextWindow: 200000,
        tier: 'fast',
      },
      'claude-3-opus-20240229': {
        maxTokens: 200000,
        maxOutputTokens: 4096,
        costPer1MTokensInput: 15.00,
        costPer1MTokensOutput: 75.00,
        supportsVision: true,
        supportsStructured: true,
        contextWindow: 200000,
        tier: 'premium',
      },
      'claude-3-sonnet-20240229': {
        maxTokens: 200000,
        maxOutputTokens: 4096,
        costPer1MTokensInput: 3.00,
        costPer1MTokensOutput: 15.00,
        supportsVision: true,
        supportsStructured: true,
        contextWindow: 200000,
        tier: 'balanced',
      },
      'claude-3-haiku-20240307': {
        maxTokens: 200000,
        maxOutputTokens: 4096,
        costPer1MTokensInput: 0.25,
        costPer1MTokensOutput: 1.25,
        supportsVision: true,
        supportsStructured: false,
        contextWindow: 200000,
        tier: 'fast',
      },
    };

    // Set default model to Claude 3.5 Sonnet if not specified
    if (!this.config.model) {
      this.config.model = 'claude-3-5-sonnet-20241022';
    }

    // Initialize intelligent model selection
    this.modelSelector = new ClaudeModelSelector(this.models);
  }

  /**
   * Validate Claude configuration
   */
  validateConfig() {
    if (!this.config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    if (this.config.model && !this.models[this.config.model]) {
      throw new Error(`Unsupported Claude model: ${this.config.model}`);
    }

    if (!this.config.maxTokens) {
      this.config.maxTokens = 4000; // Default safe limit
    }
  }

  /**
   * Initialize Claude client
   */
  async initialize() {
    try {
      this.client = new Anthropic({
        apiKey: this.config.apiKey,
        timeout: this.config.timeout || 60000,
        maxRetries: this.config.maxRetries || 3,
      });

      // Test connection with a minimal request
      await this.generateText('Hi', { maxTokens: 5 });
      
      this.isInitialized = true;
      
      // Initialize rate limiter if configured
      if (this.config.rateLimit) {
        this.setupRateLimiter();
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to initialize Claude provider: ${error.message}`);
    }
  }

  /**
   * Generate text response using Claude with intelligent model selection
   */
  async generateText(prompt, options = {}) {
    this.validateInput(prompt, options);
    
    if (!this.isInitialized) {
      throw new Error('Claude provider not initialized');
    }

    // Use intelligent model selection if no specific model requested
    const model = options.model || this.selectOptimalModel(prompt, options);
    const startTime = Date.now();

    try {
      const requestParams = {
        model,
        max_tokens: Math.min(options.maxTokens || 1000, this.models[model].maxOutputTokens),
        temperature: options.temperature || 0.7,
        top_p: options.topP || 1,
        top_k: options.topK || -1,
        stop_sequences: options.stop || [],
        messages: this.prepareMessages(prompt, options),
      };

      // Add system prompt if provided
      if (options.systemPrompt) {
        requestParams.system = options.systemPrompt;
      }

      const response = await this.client.messages.create(requestParams);
      
      const processingTime = Date.now() - startTime;
      const usage = response.usage;

      // Update usage statistics
      this.updateUsageStats({
        totalTokens: usage.input_tokens + usage.output_tokens,
        cost: this.calculateCost(model, usage.input_tokens, usage.output_tokens),
      });

      return this.normalizeResponse(response.content[0].text, {
        model,
        requestId: response.id,
        processingTime,
        finishReason: response.stop_reason,
        promptTokens: usage.input_tokens,
        completionTokens: usage.output_tokens,
        totalTokens: usage.input_tokens + usage.output_tokens,
        cost: this.calculateCost(model, usage.input_tokens, usage.output_tokens),
      });

    } catch (error) {
      return this.handleError(error, () => this.generateText(prompt, options));
    }
  }

  /**
   * Generate structured response using Claude
   */
  async generateStructured(prompt, schema, options = {}) {
    const model = options.model || this.selectOptimalModel(prompt, { ...options, requiresStructured: true });
    
    if (!this.supportsStructuredOutput(model)) {
      throw new Error(`Model ${model} does not support structured output`);
    }

    this.validateInput(prompt, options);
    
    const startTime = Date.now();

    try {
      // Create a structured prompt with schema instructions
      const structuredPrompt = this.createStructuredPrompt(prompt, schema);
      
      const requestParams = {
        model,
        max_tokens: Math.min(options.maxTokens || 2000, this.models[model].maxOutputTokens),
        temperature: options.temperature || 0.3, // Lower temperature for structured output
        messages: this.prepareMessages(structuredPrompt, options),
      };

      // Add system prompt for structured output
      requestParams.system = this.getStructuredSystemPrompt(schema, options.systemPrompt);

      const response = await this.client.messages.create(requestParams);
      
      const processingTime = Date.now() - startTime;
      const usage = response.usage;

      // Parse and validate JSON response
      let structuredContent;
      try {
        // Extract JSON from response (Claude might include extra text)
        const jsonMatch = response.content[0].text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          structuredContent = JSON.parse(jsonMatch[0]);
        } else {
          structuredContent = JSON.parse(response.content[0].text);
        }
      } catch (parseError) {
        throw new Error(`Failed to parse structured response: ${parseError.message}`);
      }

      this.updateUsageStats({
        totalTokens: usage.input_tokens + usage.output_tokens,
        cost: this.calculateCost(model, usage.input_tokens, usage.output_tokens),
      });

      return this.normalizeResponse(structuredContent, {
        model,
        requestId: response.id,
        processingTime,
        finishReason: response.stop_reason,
        promptTokens: usage.input_tokens,
        completionTokens: usage.output_tokens,
        totalTokens: usage.input_tokens + usage.output_tokens,
        cost: this.calculateCost(model, usage.input_tokens, usage.output_tokens),
        structured: true,
      });

    } catch (error) {
      return this.handleError(error, () => this.generateStructured(prompt, schema, options));
    }
  }

  /**
   * Analyze image using Claude vision models
   */
  async analyzeImage(image, prompt, options = {}) {
    const model = options.model || this.selectOptimalModel(prompt, { ...options, requiresVision: true });
    
    if (!this.supportsMultimodal(model)) {
      throw new Error(`Model ${model} does not support image analysis`);
    }

    const startTime = Date.now();

    try {
      const imageData = this.prepareImageContent(image);
      
      const messages = [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: imageData.mediaType,
              data: imageData.data,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      }];

      const requestParams = {
        model,
        max_tokens: Math.min(options.maxTokens || 1000, this.models[model].maxOutputTokens),
        temperature: options.temperature || 0.7,
        messages,
      };

      const response = await this.client.messages.create(requestParams);
      
      const processingTime = Date.now() - startTime;
      const usage = response.usage;

      this.updateUsageStats({
        totalTokens: usage.input_tokens + usage.output_tokens,
        cost: this.calculateCost(model, usage.input_tokens, usage.output_tokens),
      });

      return this.normalizeResponse(response.content[0].text, {
        model,
        requestId: response.id,
        processingTime,
        finishReason: response.stop_reason,
        promptTokens: usage.input_tokens,
        completionTokens: usage.output_tokens,
        totalTokens: usage.input_tokens + usage.output_tokens,
        cost: this.calculateCost(model, usage.input_tokens, usage.output_tokens),
        multimodal: true,
      });

    } catch (error) {
      return this.handleError(error, () => this.analyzeImage(image, prompt, options));
    }
  }

  /**
   * Intelligent model selection based on request characteristics
   */
  selectOptimalModel(prompt, options = {}) {
    return this.modelSelector.selectModel(prompt, options);
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
   * Get available Claude models
   */
  getAvailableModels() {
    return Object.keys(this.models);
  }

  /**
   * Get cost per token for current model (average of input/output)
   */
  getCostPerToken() {
    const modelInfo = this.models[this.config.model];
    if (!modelInfo) return 0.001;
    
    // Return average cost (weighted towards input tokens)
    return ((modelInfo.costPer1MTokensInput * 0.7) + (modelInfo.costPer1MTokensOutput * 0.3)) / 1000000;
  }

  /**
   * Get maximum tokens for current model
   */
  getMaxTokens() {
    return this.models[this.config.model]?.maxOutputTokens || 4096;
  }

  /**
   * Calculate cost for token usage with separate input/output pricing
   */
  calculateCost(model, inputTokens, outputTokens) {
    const modelInfo = this.models[model];
    if (!modelInfo) return 0;
    
    const inputCost = (inputTokens / 1000000) * modelInfo.costPer1MTokensInput;
    const outputCost = (outputTokens / 1000000) * modelInfo.costPer1MTokensOutput;
    
    return inputCost + outputCost;
  }

  /**
   * Prepare messages array for Claude API
   */
  prepareMessages(prompt, options = {}) {
    const messages = [];

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
   * Create structured prompt with schema instructions
   */
  createStructuredPrompt(prompt, schema) {
    return `${prompt}

Please respond with a valid JSON object that follows this schema:
${JSON.stringify(schema, null, 2)}

Only return the JSON object, no additional text or explanation.`;
  }

  /**
   * Get system prompt for structured output
   */
  getStructuredSystemPrompt(schema, existingSystemPrompt = '') {
    const structuredInstructions = `You must respond with valid JSON that strictly follows the provided schema. Do not include any text outside the JSON object.`;
    
    if (existingSystemPrompt) {
      return `${existingSystemPrompt}\n\n${structuredInstructions}`;
    }
    
    return structuredInstructions;
  }

  /**
   * Prepare image content for Claude vision API
   */
  prepareImageContent(image) {
    if (typeof image === 'string') {
      if (image.startsWith('data:image')) {
        // Extract base64 data and media type
        const matches = image.match(/^data:image\/([^;]+);base64,(.+)$/);
        if (matches) {
          return {
            mediaType: `image/${matches[1]}`,
            data: matches[2],
          };
        }
      } else if (image.startsWith('http')) {
        throw new Error('Claude does not support image URLs directly. Please provide base64 data.');
      } else {
        // Assume base64 without prefix
        return {
          mediaType: 'image/jpeg',
          data: image,
        };
      }
    } else if (Buffer.isBuffer(image)) {
      return {
        mediaType: 'image/jpeg',
        data: image.toString('base64'),
      };
    }
    
    throw new Error('Invalid image format. Provide base64 string or Buffer');
  }

  /**
   * Setup rate limiter for Claude API
   */
  setupRateLimiter() {
    // Claude has different rate limits based on tier
    this.rateLimiter = {
      remaining: 50,
      limit: 50,
      resetTime: Date.now() + 60000,
    };
  }

  /**
   * Enhanced error handling for Claude specific errors
   */
  normalizeError(error) {
    const normalized = super.normalizeError(error);

    // Add Claude-specific error handling
    if (error.type === 'overloaded_error') {
      normalized.message = 'Claude API is temporarily overloaded. Please try again.';
      normalized.code = 'SERVICE_OVERLOADED';
    } else if (error.type === 'rate_limit_error') {
      normalized.message = 'Claude API rate limit exceeded. Please try again later.';
      normalized.code = 'RATE_LIMIT_EXCEEDED';
    } else if (error.type === 'invalid_request_error') {
      normalized.message = `Invalid request: ${error.message}`;
      normalized.code = 'INVALID_REQUEST';
    }

    return normalized;
  }

  /**
   * Get Claude-specific provider information
   */
  getInfo() {
    const baseInfo = super.getInfo();
    return {
      ...baseInfo,
      models: this.models,
      defaultModel: this.config.model,
      modelSelector: this.modelSelector.getInfo(),
      apiVersion: '2023-06-01',
    };
  }
}

/**
 * Intelligent model selector for Claude
 */
class ClaudeModelSelector {
  constructor(models) {
    this.models = models;
  }

  /**
   * Select optimal model based on request characteristics
   */
  selectModel(prompt, options = {}) {
    const requirements = this.analyzeRequirements(prompt, options);
    const candidates = this.filterCandidates(requirements);
    return this.rankCandidates(candidates, requirements)[0] || 'claude-3-5-sonnet-20241022';
  }

  /**
   * Analyze prompt and options to determine requirements
   */
  analyzeRequirements(prompt, options) {
    const promptLength = prompt.length;
    const estimatedTokens = Math.ceil(promptLength / 4);
    
    return {
      complexity: this.assessComplexity(prompt),
      promptTokens: estimatedTokens,
      maxTokens: options.maxTokens || 1000,
      requiresVision: options.requiresVision || false,
      requiresStructured: options.requiresStructured || false,
      speedPriority: options.speedPriority || false,
      costPriority: options.costPriority || false,
      qualityPriority: options.qualityPriority || false,
    };
  }

  /**
   * Assess prompt complexity
   */
  assessComplexity(prompt) {
    const indicators = {
      reasoning: /analyze|reasoning|logic|complex|sophisticated|detailed analysis/i,
      creative: /creative|story|poem|imaginative|original/i,
      technical: /code|programming|technical|algorithm|implementation/i,
      simple: /simple|quick|brief|short/i,
    };

    if (indicators.reasoning.test(prompt)) return 'high';
    if (indicators.creative.test(prompt)) return 'medium';
    if (indicators.technical.test(prompt)) return 'medium';
    if (indicators.simple.test(prompt)) return 'low';
    
    return 'medium';
  }

  /**
   * Filter models based on requirements
   */
  filterCandidates(requirements) {
    return Object.keys(this.models).filter(model => {
      const modelInfo = this.models[model];
      
      if (requirements.requiresVision && !modelInfo.supportsVision) return false;
      if (requirements.requiresStructured && !modelInfo.supportsStructured) return false;
      if (requirements.maxTokens > modelInfo.maxOutputTokens) return false;
      
      return true;
    });
  }

  /**
   * Rank candidate models based on requirements
   */
  rankCandidates(candidates, requirements) {
    return candidates.sort((a, b) => {
      const scoreA = this.calculateScore(a, requirements);
      const scoreB = this.calculateScore(b, requirements);
      return scoreB - scoreA; // Higher score first
    });
  }

  /**
   * Calculate score for model based on requirements
   */
  calculateScore(model, requirements) {
    const modelInfo = this.models[model];
    let score = 0;

    // Base tier scoring
    const tierScores = { fast: 1, balanced: 2, advanced: 3, premium: 4 };
    score += tierScores[modelInfo.tier] || 0;

    // Complexity matching
    if (requirements.complexity === 'high' && modelInfo.tier === 'premium') score += 10;
    if (requirements.complexity === 'medium' && modelInfo.tier === 'advanced') score += 8;
    if (requirements.complexity === 'low' && modelInfo.tier === 'fast') score += 6;

    // Priority adjustments
    if (requirements.speedPriority && modelInfo.tier === 'fast') score += 15;
    if (requirements.costPriority) {
      const avgCost = (modelInfo.costPer1MTokensInput + modelInfo.costPer1MTokensOutput) / 2;
      score += Math.max(0, 20 - avgCost); // Lower cost = higher score
    }
    if (requirements.qualityPriority && modelInfo.tier === 'premium') score += 12;

    return score;
  }

  /**
   * Get selector information
   */
  getInfo() {
    return {
      availableModels: Object.keys(this.models),
      selectionCriteria: ['complexity', 'speed', 'cost', 'quality', 'vision', 'structured'],
      defaultModel: 'claude-3-5-sonnet-20241022',
    };
  }
}

module.exports = { ClaudeProvider };