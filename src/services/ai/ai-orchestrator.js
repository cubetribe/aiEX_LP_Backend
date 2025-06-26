/**
 * AI Orchestrator Service
 * Intelligent provider selection and management for the GoAIX platform
 * Handles multiple AI providers with fallback, load balancing, and cost optimization
 */

'use strict';

const { OpenAIProvider } = require('./providers/openai-provider');
const { ClaudeProvider } = require('./providers/claude-provider');
const { GeminiProvider } = require('./providers/gemini-provider');

/**
 * AI Orchestrator - Main service for managing AI providers
 */
class AIOrchestrator {
  constructor(strapi) {
    this.strapi = strapi;
    this.providers = new Map();
    this.isInitialized = false;
    this.defaultProvider = null;
    this.loadBalancer = new ProviderLoadBalancer();
    this.fallbackChain = [];
    this.cache = new Map(); // Simple in-memory cache
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalCost: 0,
      providerUsage: {},
    };

    // Configuration from environment
    this.config = {
      enableFallback: process.env.AI_ENABLE_FALLBACK !== 'false',
      enableCaching: process.env.AI_ENABLE_CACHING !== 'false',
      cacheTimeout: parseInt(process.env.AI_CACHE_TIMEOUT) || 3600000, // 1 hour
      maxRetries: parseInt(process.env.AI_MAX_RETRIES) || 3,
      costOptimization: process.env.AI_COST_OPTIMIZATION === 'true',
      loadBalancing: process.env.AI_LOAD_BALANCING === 'true',
    };
  }

  /**
   * Initialize the AI orchestrator with configured providers
   */
  async initialize() {
    try {
      this.strapi.log.info('🤖 Initializing AI Orchestrator...');

      // Initialize OpenAI provider
      if (process.env.OPENAI_API_KEY) {
        await this.registerProvider('openai', OpenAIProvider, {
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o',
          organization: process.env.OPENAI_ORGANIZATION,
          maxRetries: 3,
          timeout: 30000,
        });
      }

      // Initialize Claude provider
      if (process.env.ANTHROPIC_API_KEY) {
        await this.registerProvider('claude', ClaudeProvider, {
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: process.env.CLAUDE_DEFAULT_MODEL || 'claude-3-5-sonnet-20241022',
          maxRetries: 3,
          timeout: 60000,
        });
      }

      // Initialize Gemini provider
      if (process.env.GOOGLE_AI_API_KEY) {
        await this.registerProvider('gemini', GeminiProvider, {
          apiKey: process.env.GOOGLE_AI_API_KEY,
          model: process.env.GEMINI_DEFAULT_MODEL || 'gemini-1.5-flash',
          maxRetries: 3,
          timeout: 30000,
        });
      }

      // Set up fallback chain and default provider
      this.setupProviderHierarchy();

      // Initialize metrics tracking
      this.initializeMetrics();

      this.isInitialized = true;
      this.strapi.log.info(`✅ AI Orchestrator initialized with ${this.providers.size} providers`);
      this.strapi.log.info(`🎯 Default provider: ${this.defaultProvider}`);
      
      return true;
    } catch (error) {
      this.strapi.log.error('❌ Failed to initialize AI Orchestrator:', error);
      throw error;
    }
  }

  /**
   * Register a new AI provider
   */
  async registerProvider(name, ProviderClass, config) {
    try {
      const provider = new ProviderClass(config);
      await provider.initialize();
      
      this.providers.set(name, provider);
      this.strapi.log.info(`📦 Registered ${name} provider`);
      
      return provider;
    } catch (error) {
      this.strapi.log.warn(`⚠️ Failed to register ${name} provider:`, error.message);
      throw error;
    }
  }

  /**
   * Generate text with intelligent provider selection
   */
  async generateText(prompt, options = {}) {
    this.validateInitialization();
    this.metrics.totalRequests++;

    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.getFromCache('text', prompt, options);
      if (cached) {
        return cached;
      }
    }

    const provider = this.selectProvider(prompt, options);
    
    try {
      const result = await this.executeWithFallback(
        provider,
        'generateText',
        [prompt, options]
      );

      // Cache result
      if (this.config.enableCaching && result.success) {
        this.cacheResult('text', prompt, options, result);
      }

      this.metrics.successfulRequests++;
      this.updateProviderMetrics(provider, result);
      
      return result;
    } catch (error) {
      this.metrics.failedRequests++;
      throw error;
    }
  }

  /**
   * Generate structured response with intelligent provider selection
   */
  async generateStructured(prompt, schema, options = {}) {
    this.validateInitialization();
    this.metrics.totalRequests++;

    // Filter providers that support structured output
    const supportedProviders = Array.from(this.providers.entries())
      .filter(([_, provider]) => provider.supportsStructuredOutput(options.model))
      .map(([name, _]) => name);

    if (supportedProviders.length === 0) {
      throw new Error('No providers support structured output for the requested model');
    }

    const provider = this.selectProvider(prompt, {
      ...options,
      requiresStructured: true,
      supportedProviders,
    });

    try {
      const result = await this.executeWithFallback(
        provider,
        'generateStructured',
        [prompt, schema, options]
      );

      this.metrics.successfulRequests++;
      this.updateProviderMetrics(provider, result);
      
      return result;
    } catch (error) {
      this.metrics.failedRequests++;
      throw error;
    }
  }

  /**
   * Analyze image with multimodal provider selection
   */
  async analyzeImage(image, prompt, options = {}) {
    this.validateInitialization();
    this.metrics.totalRequests++;

    // Filter providers that support vision
    const supportedProviders = Array.from(this.providers.entries())
      .filter(([_, provider]) => provider.supportsMultimodal(options.model))
      .map(([name, _]) => name);

    if (supportedProviders.length === 0) {
      throw new Error('No providers support image analysis for the requested model');
    }

    const provider = this.selectProvider(prompt, {
      ...options,
      requiresVision: true,
      supportedProviders,
    });

    try {
      const result = await this.executeWithFallback(
        provider,
        'analyzeImage',
        [image, prompt, options]
      );

      this.metrics.successfulRequests++;
      this.updateProviderMetrics(provider, result);
      
      return result;
    } catch (error) {
      this.metrics.failedRequests++;
      throw error;
    }
  }

  /**
   * Intelligent provider selection based on request characteristics
   */
  selectProvider(prompt, options = {}) {
    // Use explicitly requested provider
    if (options.provider && this.providers.has(options.provider)) {
      return options.provider;
    }

    // Filter by supported providers if specified
    let candidates = Array.from(this.providers.keys());
    if (options.supportedProviders) {
      candidates = candidates.filter(name => options.supportedProviders.includes(name));
    }

    if (candidates.length === 0) {
      throw new Error('No suitable providers available for this request');
    }

    if (candidates.length === 1) {
      return candidates[0];
    }

    // Use load balancing if enabled
    if (this.config.loadBalancing) {
      return this.loadBalancer.selectProvider(candidates, this.providers);
    }

    // Use cost optimization if enabled
    if (this.config.costOptimization) {
      return this.selectCostOptimalProvider(prompt, options, candidates);
    }

    // Select based on request characteristics
    return this.selectByCharacteristics(prompt, options, candidates);
  }

  /**
   * Select provider based on cost optimization
   */
  selectCostOptimalProvider(prompt, options, candidates) {
    const estimatedTokens = this.estimateTokens(prompt);
    let bestProvider = candidates[0];
    let lowestCost = Infinity;

    for (const providerName of candidates) {
      const provider = this.providers.get(providerName);
      const cost = provider.getCostPerToken() * estimatedTokens;
      
      if (cost < lowestCost) {
        lowestCost = cost;
        bestProvider = providerName;
      }
    }

    return bestProvider;
  }

  /**
   * Select provider based on request characteristics
   */
  selectByCharacteristics(prompt, options, candidates) {
    // Analyze request characteristics
    const characteristics = this.analyzeRequest(prompt, options);
    
    // Score each candidate provider
    let bestProvider = candidates[0];
    let highestScore = -1;

    for (const providerName of candidates) {
      const score = this.scoreProvider(providerName, characteristics);
      if (score > highestScore) {
        highestScore = score;
        bestProvider = providerName;
      }
    }

    return bestProvider;
  }

  /**
   * Analyze request characteristics for provider selection
   */
  analyzeRequest(prompt, options) {
    const promptLength = prompt.length;
    const estimatedTokens = this.estimateTokens(prompt);
    
    return {
      complexity: this.assessComplexity(prompt),
      length: promptLength,
      tokens: estimatedTokens,
      requiresVision: options.requiresVision || false,
      requiresStructured: options.requiresStructured || false,
      speedPriority: options.speedPriority || false,
      qualityPriority: options.qualityPriority || false,
      costPriority: options.costPriority || false,
    };
  }

  /**
   * Score provider for given characteristics
   */
  scoreProvider(providerName, characteristics) {
    const provider = this.providers.get(providerName);
    let score = 0;

    // Base scoring
    if (providerName === 'openai') score += 5; // Reliable baseline
    if (providerName === 'claude') score += 6; // Good for complex reasoning
    if (providerName === 'gemini') score += 4; // Good for multimodal

    // Complexity scoring
    if (characteristics.complexity === 'high') {
      if (providerName === 'claude') score += 10;
      if (providerName === 'openai') score += 7;
    } else if (characteristics.complexity === 'low') {
      if (providerName === 'gemini') score += 8;
      if (providerName === 'openai') score += 6;
    }

    // Speed priority
    if (characteristics.speedPriority) {
      if (providerName === 'gemini') score += 10;
      if (providerName === 'openai') score += 7;
    }

    // Quality priority
    if (characteristics.qualityPriority) {
      if (providerName === 'claude') score += 10;
      if (providerName === 'openai') score += 8;
    }

    // Cost priority
    if (characteristics.costPriority) {
      const costPerToken = provider.getCostPerToken();
      score += Math.max(0, 15 - (costPerToken * 10000)); // Lower cost = higher score
    }

    // Vision requirements
    if (characteristics.requiresVision) {
      if (provider.supportsMultimodal()) score += 15;
      else score = 0; // Eliminate if doesn't support vision
    }

    // Structured output requirements
    if (characteristics.requiresStructured) {
      if (provider.supportsStructuredOutput()) score += 10;
      else score = 0; // Eliminate if doesn't support structured output
    }

    // Health and performance factors
    const health = this.getProviderHealth(providerName);
    score *= health.reliability;

    return score;
  }

  /**
   * Execute request with fallback mechanism
   */
  async executeWithFallback(primaryProvider, method, args) {
    const providers = [primaryProvider, ...this.getFallbackProviders(primaryProvider)];
    let lastError;

    for (const providerName of providers) {
      if (!this.providers.has(providerName)) continue;

      const provider = this.providers.get(providerName);
      
      try {
        this.strapi.log.debug(`🤖 Executing ${method} with ${providerName} provider`);
        const result = await provider[method](...args);
        
        if (providerName !== primaryProvider) {
          this.strapi.log.warn(`⚠️ Fallback to ${providerName} provider succeeded`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        this.strapi.log.warn(`❌ ${providerName} provider failed:`, error.message);
        
        if (!this.config.enableFallback || providers.indexOf(providerName) === providers.length - 1) {
          break;
        }
      }
    }

    throw lastError || new Error('All providers failed');
  }

  /**
   * Get fallback providers for a given primary provider
   */
  getFallbackProviders(primaryProvider) {
    const allProviders = Array.from(this.providers.keys());
    return allProviders.filter(name => name !== primaryProvider);
  }

  /**
   * Assess prompt complexity
   */
  assessComplexity(prompt) {
    const indicators = {
      high: /analyze|reasoning|complex|sophisticated|detailed|logic|problem/i,
      medium: /explain|describe|compare|summarize/i,
      low: /simple|quick|brief|short|list/i,
    };

    if (indicators.high.test(prompt)) return 'high';
    if (indicators.medium.test(prompt)) return 'medium';
    if (indicators.low.test(prompt)) return 'low';
    
    // Default based on length
    return prompt.length > 500 ? 'medium' : 'low';
  }

  /**
   * Estimate token count for text
   */
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  /**
   * Set up provider hierarchy and fallback chain
   */
  setupProviderHierarchy() {
    const providerNames = Array.from(this.providers.keys());
    
    // Set default provider (prefer Claude > OpenAI > Gemini)
    if (providerNames.includes('claude')) {
      this.defaultProvider = 'claude';
    } else if (providerNames.includes('openai')) {
      this.defaultProvider = 'openai';
    } else if (providerNames.includes('gemini')) {
      this.defaultProvider = 'gemini';
    }

    // Set up fallback chain
    this.fallbackChain = providerNames.filter(name => name !== this.defaultProvider);
  }

  /**
   * Cache management
   */
  getFromCache(type, prompt, options) {
    if (!this.config.enableCaching) return null;
    
    const key = this.generateCacheKey(type, prompt, options);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
      this.strapi.log.debug(`💾 Cache hit for ${type} request`);
      return cached.result;
    }
    
    return null;
  }

  cacheResult(type, prompt, options, result) {
    if (!this.config.enableCaching) return;
    
    const key = this.generateCacheKey(type, prompt, options);
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });
    
    // Clean up old cache entries periodically
    if (this.cache.size > 1000) {
      this.cleanupCache();
    }
  }

  generateCacheKey(type, prompt, options) {
    const keyData = {
      type,
      prompt: prompt.substring(0, 200), // Truncate for key generation
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    };
    
    return JSON.stringify(keyData);
  }

  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.config.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Initialize metrics tracking
   */
  initializeMetrics() {
    for (const providerName of this.providers.keys()) {
      this.metrics.providerUsage[providerName] = {
        requests: 0,
        successes: 0,
        failures: 0,
        totalCost: 0,
        averageResponseTime: 0,
      };
    }
  }

  /**
   * Update provider metrics
   */
  updateProviderMetrics(providerName, result) {
    const metrics = this.metrics.providerUsage[providerName];
    if (!metrics) return;

    metrics.requests++;
    if (result.success) {
      metrics.successes++;
    } else {
      metrics.failures++;
    }

    if (result.metadata?.cost) {
      metrics.totalCost += result.metadata.cost;
      this.metrics.totalCost += result.metadata.cost;
    }

    if (result.metadata?.processingTime) {
      metrics.averageResponseTime = 
        (metrics.averageResponseTime * (metrics.requests - 1) + result.metadata.processingTime) 
        / metrics.requests;
    }
  }

  /**
   * Get provider health status
   */
  getProviderHealth(providerName) {
    const metrics = this.metrics.providerUsage[providerName];
    if (!metrics || metrics.requests === 0) {
      return { reliability: 1.0, status: 'unknown' };
    }

    const reliability = metrics.successes / metrics.requests;
    const status = reliability > 0.95 ? 'healthy' : reliability > 0.8 ? 'degraded' : 'unhealthy';

    return { reliability, status };
  }

  /**
   * Validate that orchestrator is initialized
   */
  validateInitialization() {
    if (!this.isInitialized) {
      throw new Error('AI Orchestrator not initialized');
    }

    if (this.providers.size === 0) {
      throw new Error('No AI providers available');
    }
  }

  /**
   * Validate available providers
   */
  async validateProviders() {
    const validProviders = [];
    
    for (const [name, provider] of this.providers) {
      try {
        const health = await provider.checkHealth();
        if (health.healthy) {
          validProviders.push(name);
        } else {
          this.strapi.log.warn(`⚠️ Provider ${name} health check failed`);
        }
      } catch (error) {
        this.strapi.log.warn(`⚠️ Provider ${name} validation failed:`, error.message);
      }
    }

    return validProviders;
  }

  /**
   * Get orchestrator status and metrics
   */
  getStatus() {
    const providerStatuses = {};
    for (const [name, provider] of this.providers) {
      providerStatuses[name] = {
        ...provider.getInfo(),
        health: this.getProviderHealth(name),
        usage: this.metrics.providerUsage[name],
      };
    }

    return {
      initialized: this.isInitialized,
      totalProviders: this.providers.size,
      defaultProvider: this.defaultProvider,
      providers: providerStatuses,
      metrics: this.metrics,
      configuration: this.config,
      cacheSize: this.cache.size,
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.strapi.log.info('🗑️ AI Orchestrator cache cleared');
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalCost: 0,
      providerUsage: {},
    };
    this.initializeMetrics();
    this.strapi.log.info('📊 AI Orchestrator metrics reset');
  }
}

/**
 * Simple load balancer for AI providers
 */
class ProviderLoadBalancer {
  constructor() {
    this.roundRobinIndex = 0;
    this.requestCounts = new Map();
  }

  selectProvider(candidates, providers) {
    // Simple round-robin load balancing
    const provider = candidates[this.roundRobinIndex % candidates.length];
    this.roundRobinIndex++;
    
    // Track request counts
    this.requestCounts.set(provider, (this.requestCounts.get(provider) || 0) + 1);
    
    return provider;
  }

  getStats() {
    return Object.fromEntries(this.requestCounts);
  }
}

module.exports = { AIOrchestrator };