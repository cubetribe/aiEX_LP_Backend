/**
 * Gemini Provider Implementation
 * Implements the BaseAIProvider for Google Gemini models with multi-modal support
 */

'use strict';

const { BaseAIProvider } = require('./base-provider');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Gemini provider implementation
 * Supports Gemini Pro, Gemini Pro Vision, and other Google AI models with advanced multimodal capabilities
 */
class GeminiProvider extends BaseAIProvider {
  constructor(config) {
    super(config);
    
    this.client = null;
    this.models = {
      'gemini-1.5-pro': {
        maxTokens: 2097152, // 2M tokens context window
        maxOutputTokens: 8192,
        costPer1MTokensInput: 1.25,
        costPer1MTokensOutput: 5.00,
        supportsVision: true,
        supportsStructured: true,
        supportsVideo: true,
        supportsAudio: true,
        contextWindow: 2097152,
        tier: 'advanced',
      },
      'gemini-1.5-flash': {
        maxTokens: 1048576, // 1M tokens context window
        maxOutputTokens: 8192,
        costPer1MTokensInput: 0.075,
        costPer1MTokensOutput: 0.30,
        supportsVision: true,
        supportsStructured: true,
        supportsVideo: true,
        supportsAudio: true,
        contextWindow: 1048576,
        tier: 'fast',
      },
      'gemini-1.5-flash-8b': {
        maxTokens: 1048576,
        maxOutputTokens: 8192,
        costPer1MTokensInput: 0.0375,
        costPer1MTokensOutput: 0.15,
        supportsVision: true,
        supportsStructured: true,
        supportsVideo: false,
        supportsAudio: false,
        contextWindow: 1048576,
        tier: 'fast',
      },
      'gemini-pro': {
        maxTokens: 32768,
        maxOutputTokens: 8192,
        costPer1MTokensInput: 0.50,
        costPer1MTokensOutput: 1.50,
        supportsVision: false,
        supportsStructured: true,
        supportsVideo: false,
        supportsAudio: false,
        contextWindow: 32768,
        tier: 'balanced',
      },
      'gemini-pro-vision': {
        maxTokens: 16384,
        maxOutputTokens: 4096,
        costPer1MTokensInput: 0.25,
        costPer1MTokensOutput: 0.50,
        supportsVision: true,
        supportsStructured: false,
        supportsVideo: false,
        supportsAudio: false,
        contextWindow: 16384,
        tier: 'vision',
      },
    };

    // Set default model to Gemini 1.5 Flash if not specified
    if (!this.config.model) {
      this.config.model = 'gemini-1.5-flash';
    }

    // Initialize multimodal capabilities
    this.supportedImageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];
    this.supportedVideoTypes = ['video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/x-flv', 'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp'];
    this.supportedAudioTypes = ['audio/wav', 'audio/mp3', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac'];
  }

  /**
   * Validate Gemini configuration
   */
  validateConfig() {
    if (!this.config.apiKey) {
      throw new Error('Google AI API key is required');
    }

    if (this.config.model && !this.models[this.config.model]) {
      throw new Error(`Unsupported Gemini model: ${this.config.model}`);
    }

    if (!this.config.maxTokens) {
      this.config.maxTokens = 2048; // Default safe limit
    }
  }

  /**
   * Initialize Gemini client
   */
  async initialize() {
    try {
      this.client = new GoogleGenerativeAI(this.config.apiKey);
      
      // Test connection with a minimal request
      const model = this.client.getGenerativeModel({ model: this.config.model });
      await model.generateContent('Hi');
      
      this.isInitialized = true;
      
      // Initialize rate limiter if configured
      if (this.config.rateLimit) {
        this.setupRateLimiter();
      }

      return true;
    } catch (error) {
      throw new Error(`Failed to initialize Gemini provider: ${error.message}`);
    }
  }

  /**
   * Generate text response using Gemini
   */
  async generateText(prompt, options = {}) {
    this.validateInput(prompt, options);
    
    if (!this.isInitialized) {
      throw new Error('Gemini provider not initialized');
    }

    const modelName = options.model || this.config.model;
    const startTime = Date.now();

    try {
      const model = this.client.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          maxOutputTokens: Math.min(options.maxTokens || 1000, this.models[modelName].maxOutputTokens),
          temperature: options.temperature || 0.7,
          topP: options.topP || 0.8,
          topK: options.topK || 40,
          stopSequences: options.stop || [],
        },
        safetySettings: this.getSafetySettings(options),
      });

      // Prepare content with conversation history if provided
      const content = this.prepareContent(prompt, options);
      
      const result = await model.generateContent(content);
      const response = await result.response;
      
      const processingTime = Date.now() - startTime;
      
      // Extract usage information (Gemini doesn't always provide detailed usage)
      const usage = this.extractUsageInfo(response, prompt, options);

      // Update usage statistics
      this.updateUsageStats({
        totalTokens: usage.totalTokens,
        cost: this.calculateCost(modelName, usage.inputTokens, usage.outputTokens),
      });

      return this.normalizeResponse(response.text(), {
        model: modelName,
        requestId: response.id || `gemini-${Date.now()}`,
        processingTime,
        finishReason: response.candidates?.[0]?.finishReason || 'stop',
        promptTokens: usage.inputTokens,
        completionTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        cost: this.calculateCost(modelName, usage.inputTokens, usage.outputTokens),
        safetyRatings: response.candidates?.[0]?.safetyRatings,
      });

    } catch (error) {
      return this.handleError(error, () => this.generateText(prompt, options));
    }
  }

  /**
   * Generate structured response using Gemini
   */
  async generateStructured(prompt, schema, options = {}) {
    const modelName = options.model || this.config.model;
    
    if (!this.supportsStructuredOutput(modelName)) {
      throw new Error(`Model ${modelName} does not support structured output`);
    }

    this.validateInput(prompt, options);
    
    const startTime = Date.now();

    try {
      const model = this.client.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          maxOutputTokens: Math.min(options.maxTokens || 2000, this.models[modelName].maxOutputTokens),
          temperature: options.temperature || 0.3, // Lower temperature for structured output
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
        safetySettings: this.getSafetySettings(options),
      });

      const content = this.prepareContent(prompt, options);
      
      const result = await model.generateContent(content);
      const response = await result.response;
      
      const processingTime = Date.now() - startTime;
      const usage = this.extractUsageInfo(response, prompt, options);

      // Parse JSON response
      let structuredContent;
      try {
        structuredContent = JSON.parse(response.text());
      } catch (parseError) {
        throw new Error(`Failed to parse structured response: ${parseError.message}`);
      }

      this.updateUsageStats({
        totalTokens: usage.totalTokens,
        cost: this.calculateCost(modelName, usage.inputTokens, usage.outputTokens),
      });

      return this.normalizeResponse(structuredContent, {
        model: modelName,
        requestId: response.id || `gemini-${Date.now()}`,
        processingTime,
        finishReason: response.candidates?.[0]?.finishReason || 'stop',
        promptTokens: usage.inputTokens,
        completionTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        cost: this.calculateCost(modelName, usage.inputTokens, usage.outputTokens),
        structured: true,
        safetyRatings: response.candidates?.[0]?.safetyRatings,
      });

    } catch (error) {
      return this.handleError(error, () => this.generateStructured(prompt, schema, options));
    }
  }

  /**
   * Analyze media (image, video, audio) using Gemini multimodal capabilities
   */
  async analyzeImage(media, prompt, options = {}) {
    const modelName = options.model || this.selectMultimodalModel(options);
    
    if (!this.supportsMultimodal(modelName)) {
      throw new Error(`Model ${modelName} does not support multimodal analysis`);
    }

    const startTime = Date.now();

    try {
      const model = this.client.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          maxOutputTokens: Math.min(options.maxTokens || 1000, this.models[modelName].maxOutputTokens),
          temperature: options.temperature || 0.7,
        },
        safetySettings: this.getSafetySettings(options),
      });

      // Prepare multimodal content
      const content = this.prepareMultimodalContent(media, prompt, options);
      
      const result = await model.generateContent(content);
      const response = await result.response;
      
      const processingTime = Date.now() - startTime;
      const usage = this.extractUsageInfo(response, prompt, options);

      this.updateUsageStats({
        totalTokens: usage.totalTokens,
        cost: this.calculateCost(modelName, usage.inputTokens, usage.outputTokens),
      });

      return this.normalizeResponse(response.text(), {
        model: modelName,
        requestId: response.id || `gemini-${Date.now()}`,
        processingTime,
        finishReason: response.candidates?.[0]?.finishReason || 'stop',
        promptTokens: usage.inputTokens,
        completionTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        cost: this.calculateCost(modelName, usage.inputTokens, usage.outputTokens),
        multimodal: true,
        mediaType: this.detectMediaType(media),
        safetyRatings: response.candidates?.[0]?.safetyRatings,
      });

    } catch (error) {
      return this.handleError(error, () => this.analyzeImage(media, prompt, options));
    }
  }

  /**
   * Analyze video content (Gemini-specific feature)
   */
  async analyzeVideo(video, prompt, options = {}) {
    const modelName = options.model || 'gemini-1.5-pro';
    
    if (!this.models[modelName]?.supportsVideo) {
      throw new Error(`Model ${modelName} does not support video analysis`);
    }

    return this.analyzeImage(video, prompt, { ...options, model: modelName });
  }

  /**
   * Analyze audio content (Gemini-specific feature)
   */
  async analyzeAudio(audio, prompt, options = {}) {
    const modelName = options.model || 'gemini-1.5-pro';
    
    if (!this.models[modelName]?.supportsAudio) {
      throw new Error(`Model ${modelName} does not support audio analysis`);
    }

    return this.analyzeImage(audio, prompt, { ...options, model: modelName });
  }

  /**
   * Select optimal model for multimodal tasks
   */
  selectMultimodalModel(options = {}) {
    if (options.requiresVideo) return 'gemini-1.5-pro';
    if (options.requiresAudio) return 'gemini-1.5-pro';
    if (options.speedPriority) return 'gemini-1.5-flash';
    if (options.costPriority) return 'gemini-1.5-flash-8b';
    
    return 'gemini-1.5-flash'; // Good balance of speed and capability
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
   * Check if model supports video analysis
   */
  supportsVideo(model = null) {
    const targetModel = model || this.config.model;
    return this.models[targetModel]?.supportsVideo || false;
  }

  /**
   * Check if model supports audio analysis
   */
  supportsAudio(model = null) {
    const targetModel = model || this.config.model;
    return this.models[targetModel]?.supportsAudio || false;
  }

  /**
   * Get available Gemini models
   */
  getAvailableModels() {
    return Object.keys(this.models);
  }

  /**
   * Get cost per token for current model
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
    return this.models[this.config.model]?.maxOutputTokens || 8192;
  }

  /**
   * Calculate cost for token usage
   */
  calculateCost(model, inputTokens, outputTokens) {
    const modelInfo = this.models[model];
    if (!modelInfo) return 0;
    
    const inputCost = (inputTokens / 1000000) * modelInfo.costPer1MTokensInput;
    const outputCost = (outputTokens / 1000000) * modelInfo.costPer1MTokensOutput;
    
    return inputCost + outputCost;
  }

  /**
   * Prepare content for Gemini API
   */
  prepareContent(prompt, options = {}) {
    const parts = [{ text: prompt }];

    // Add conversation history if provided
    if (options.history && Array.isArray(options.history)) {
      // Gemini uses a different format for conversation history
      // This would need to be handled differently than other providers
    }

    return parts;
  }

  /**
   * Prepare multimodal content for Gemini API
   */
  prepareMultimodalContent(media, prompt, options = {}) {
    const parts = [{ text: prompt }];

    // Add media content
    if (Array.isArray(media)) {
      media.forEach(item => {
        parts.push(this.prepareMediaPart(item));
      });
    } else {
      parts.push(this.prepareMediaPart(media));
    }

    return parts;
  }

  /**
   * Prepare individual media part for Gemini API
   */
  prepareMediaPart(media) {
    const mediaType = this.detectMediaType(media);
    
    if (typeof media === 'string') {
      if (media.startsWith('data:')) {
        // Extract base64 data
        const matches = media.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          return {
            inlineData: {
              mimeType: matches[1],
              data: matches[2],
            },
          };
        }
      } else if (media.startsWith('http')) {
        throw new Error('Gemini does not support media URLs directly. Please provide base64 data.');
      } else {
        // Assume base64 without prefix
        return {
          inlineData: {
            mimeType: mediaType,
            data: media,
          },
        };
      }
    } else if (Buffer.isBuffer(media)) {
      return {
        inlineData: {
          mimeType: mediaType,
          data: media.toString('base64'),
        },
      };
    }

    throw new Error('Invalid media format. Provide base64 string or Buffer');
  }

  /**
   * Detect media type from content
   */
  detectMediaType(media) {
    if (typeof media === 'string' && media.startsWith('data:')) {
      const matches = media.match(/^data:([^;]+);/);
      return matches ? matches[1] : 'application/octet-stream';
    }
    
    // Default to image/jpeg for unknown types
    return 'image/jpeg';
  }

  /**
   * Extract usage information from Gemini response
   */
  extractUsageInfo(response, prompt, options) {
    // Gemini doesn't always provide detailed usage information
    // We'll estimate based on input and response length
    const inputTokens = this.estimateTokens(prompt);
    const outputTokens = this.estimateTokens(response.text());
    
    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    };
  }

  /**
   * Get safety settings for Gemini API
   */
  getSafetySettings(options = {}) {
    const { HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
    
    const defaultSettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];

    return options.safetySettings || defaultSettings;
  }

  /**
   * Setup rate limiter for Gemini API
   */
  setupRateLimiter() {
    // Gemini has generous rate limits
    this.rateLimiter = {
      remaining: 60,
      limit: 60,
      resetTime: Date.now() + 60000,
    };
  }

  /**
   * Enhanced error handling for Gemini specific errors
   */
  normalizeError(error) {
    const normalized = super.normalizeError(error);

    // Add Gemini-specific error handling
    if (error.message?.includes('SAFETY')) {
      normalized.message = 'Content blocked by Gemini safety filters';
      normalized.code = 'SAFETY_FILTER';
    } else if (error.message?.includes('RECITATION')) {
      normalized.message = 'Content blocked due to recitation concerns';
      normalized.code = 'RECITATION_BLOCKED';
    } else if (error.message?.includes('quota')) {
      normalized.message = 'Gemini API quota exceeded';
      normalized.code = 'QUOTA_EXCEEDED';
    }

    return normalized;
  }

  /**
   * Get Gemini-specific provider information
   */
  getInfo() {
    const baseInfo = super.getInfo();
    return {
      ...baseInfo,
      models: this.models,
      defaultModel: this.config.model,
      supportedImageTypes: this.supportedImageTypes,
      supportedVideoTypes: this.supportedVideoTypes,
      supportedAudioTypes: this.supportedAudioTypes,
      multimodalCapabilities: {
        supportsVideo: true,
        supportsAudio: true,
        supportsMultipleMedia: true,
        maxContextWindow: 2097152,
      },
      apiVersion: 'v1',
    };
  }
}

module.exports = { GeminiProvider };