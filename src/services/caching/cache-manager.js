/**
 * Cache Manager Service
 * Advanced caching system for AI responses, campaign data, and performance optimization
 */

'use strict';

const NodeCache = require('node-cache');
const crypto = require('crypto');

/**
 * Cache Manager Service
 * Manages multiple cache layers for different types of data
 */
class CacheManager {
  constructor(strapi) {
    this.strapi = strapi;
    this.isInitialized = false;
    this.redisClient = null;
    
    // Multiple cache instances for different data types
    this.caches = {
      // AI response cache (longer TTL, larger size)
      ai: new NodeCache({
        stdTTL: parseInt(process.env.AI_CACHE_TTL) || 3600, // 1 hour
        maxKeys: parseInt(process.env.AI_CACHE_MAX_KEYS) || 1000,
        checkperiod: 600, // Check for expired keys every 10 minutes
        useClones: false, // For performance
      }),
      
      // Campaign data cache (medium TTL)
      campaigns: new NodeCache({
        stdTTL: parseInt(process.env.CAMPAIGN_CACHE_TTL) || 1800, // 30 minutes
        maxKeys: parseInt(process.env.CAMPAIGN_CACHE_MAX_KEYS) || 500,
        checkperiod: 300,
        useClones: false,
      }),
      
      // API response cache (short TTL, high volume)
      api: new NodeCache({
        stdTTL: parseInt(process.env.API_CACHE_TTL) || 300, // 5 minutes
        maxKeys: parseInt(process.env.API_CACHE_MAX_KEYS) || 2000,
        checkperiod: 60,
        useClones: false,
      }),
      
      // User session cache (medium TTL)
      sessions: new NodeCache({
        stdTTL: parseInt(process.env.SESSION_CACHE_TTL) || 7200, // 2 hours
        maxKeys: parseInt(process.env.SESSION_CACHE_MAX_KEYS) || 10000,
        checkperiod: 300,
        useClones: false,
      }),
    };

    // Cache configuration
    this.config = {
      enableRedis: process.env.REDIS_CACHE_ENABLED === 'true',
      enableCompression: process.env.CACHE_COMPRESSION_ENABLED !== 'false',
      enableEncryption: process.env.CACHE_ENCRYPTION_ENABLED === 'true',
      encryptionKey: process.env.CACHE_ENCRYPTION_KEY,
      redisPrefix: process.env.REDIS_CACHE_PREFIX || 'goaix:cache:',
      enableStats: process.env.CACHE_STATS_ENABLED !== 'false',
    };

    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      errors: 0,
      startTime: Date.now(),
    };

    // Cache event listeners
    this.setupCacheEventListeners();
  }

  /**
   * Initialize the cache manager
   */
  async initialize() {
    try {
      this.strapi.log.info('💾 Initializing Cache Manager...');

      // Initialize Redis if enabled
      if (this.config.enableRedis) {
        await this.initializeRedis();
      }

      // Validate encryption key if encryption is enabled
      if (this.config.enableEncryption && !this.config.encryptionKey) {
        throw new Error('Cache encryption enabled but no encryption key provided');
      }

      this.isInitialized = true;
      this.strapi.log.info('✅ Cache Manager initialized');

      return true;
    } catch (error) {
      this.strapi.log.error('❌ Failed to initialize Cache Manager:', error);
      throw error;
    }
  }

  /**
   * Initialize Redis connection
   */
  async initializeRedis() {
    try {
      const Redis = require('ioredis');
      
      this.redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_CACHE_DB) || 2,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        lazyConnect: true,
      });

      await this.redisClient.connect();
      this.strapi.log.info('📡 Redis cache connection established');

    } catch (error) {
      this.strapi.log.warn('⚠️ Redis cache connection failed, using memory cache only:', error.message);
      this.config.enableRedis = false;
      this.redisClient = null;
    }
  }

  /**
   * Setup cache event listeners for statistics
   */
  setupCacheEventListeners() {
    Object.values(this.caches).forEach(cache => {
      cache.on('set', () => {
        this.stats.sets++;
        this.updateCacheSize();
      });

      cache.on('del', () => {
        this.stats.deletes++;
        this.updateCacheSize();
      });

      cache.on('expired', () => {
        this.stats.deletes++;
        this.updateCacheSize();
      });
    });
  }

  /**
   * Get data from cache
   */
  async get(cacheType, key) {
    this.validateCacheType(cacheType);
    
    try {
      const cacheKey = this.generateCacheKey(cacheType, key);
      let value = null;

      // Try Redis first if available
      if (this.config.enableRedis && this.redisClient) {
        const redisValue = await this.redisClient.get(cacheKey);
        if (redisValue) {
          value = await this.deserializeValue(redisValue);
          this.strapi.log.debug(`🎯 Redis cache hit: ${cacheKey}`);
        }
      }

      // Fall back to memory cache
      if (value === null) {
        value = this.caches[cacheType].get(key);
        if (value !== undefined) {
          this.strapi.log.debug(`🎯 Memory cache hit: ${key}`);
        }
      }

      // Update statistics
      if (value !== null && value !== undefined) {
        this.stats.hits++;
        return value;
      } else {
        this.stats.misses++;
        return null;
      }

    } catch (error) {
      this.stats.errors++;
      this.strapi.log.error(`Cache get error for ${key}:`, error);
      return null;
    }
  }

  /**
   * Set data in cache
   */
  async set(cacheType, key, value, ttl = null) {
    this.validateCacheType(cacheType);
    
    try {
      const cacheKey = this.generateCacheKey(cacheType, key);
      const serializedValue = await this.serializeValue(value);

      // Set in Redis if available
      if (this.config.enableRedis && this.redisClient) {
        const redisTTL = ttl || this.caches[cacheType].options.stdTTL;
        if (redisTTL) {
          await this.redisClient.setex(cacheKey, redisTTL, serializedValue);
        } else {
          await this.redisClient.set(cacheKey, serializedValue);
        }
      }

      // Set in memory cache
      if (ttl) {
        this.caches[cacheType].set(key, value, ttl);
      } else {
        this.caches[cacheType].set(key, value);
      }

      this.strapi.log.debug(`💾 Cache set: ${key}`);
      return true;

    } catch (error) {
      this.stats.errors++;
      this.strapi.log.error(`Cache set error for ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete data from cache
   */
  async delete(cacheType, key) {
    this.validateCacheType(cacheType);
    
    try {
      const cacheKey = this.generateCacheKey(cacheType, key);

      // Delete from Redis if available
      if (this.config.enableRedis && this.redisClient) {
        await this.redisClient.del(cacheKey);
      }

      // Delete from memory cache
      this.caches[cacheType].del(key);

      this.strapi.log.debug(`🗑️ Cache deleted: ${key}`);
      return true;

    } catch (error) {
      this.stats.errors++;
      this.strapi.log.error(`Cache delete error for ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear entire cache type
   */
  async clear(cacheType) {
    this.validateCacheType(cacheType);
    
    try {
      // Clear Redis keys if available
      if (this.config.enableRedis && this.redisClient) {
        const pattern = `${this.config.redisPrefix}${cacheType}:*`;
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      }

      // Clear memory cache
      this.caches[cacheType].flushAll();

      this.strapi.log.info(`🧹 Cache cleared: ${cacheType}`);
      return true;

    } catch (error) {
      this.stats.errors++;
      this.strapi.log.error(`Cache clear error for ${cacheType}:`, error);
      return false;
    }
  }

  /**
   * Cache AI response with intelligent key generation
   */
  async cacheAIResponse(prompt, options, response) {
    const cacheKey = this.generateAICacheKey(prompt, options);
    
    const cacheData = {
      prompt: prompt.substring(0, 200), // Truncated for storage efficiency
      options: this.sanitizeOptions(options),
      response,
      timestamp: Date.now(),
      provider: response.provider,
      model: response.model,
    };

    return await this.set('ai', cacheKey, cacheData, 3600); // 1 hour TTL
  }

  /**
   * Get cached AI response
   */
  async getCachedAIResponse(prompt, options) {
    const cacheKey = this.generateAICacheKey(prompt, options);
    const cached = await this.get('ai', cacheKey);
    
    if (cached && this.isAIResponseValid(cached)) {
      this.strapi.log.debug('🎯 AI response cache hit');
      return cached.response;
    }
    
    return null;
  }

  /**
   * Cache campaign data
   */
  async cacheCampaign(slug, campaignData) {
    const cacheKey = `campaign:${slug}`;
    
    const cacheData = {
      ...campaignData,
      cachedAt: Date.now(),
    };

    return await this.set('campaigns', cacheKey, cacheData, 1800); // 30 minutes
  }

  /**
   * Get cached campaign
   */
  async getCachedCampaign(slug) {
    const cacheKey = `campaign:${slug}`;
    return await this.get('campaigns', cacheKey);
  }

  /**
   * Cache API response
   */
  async cacheAPIResponse(endpoint, params, response) {
    const cacheKey = this.generateAPICacheKey(endpoint, params);
    
    const cacheData = {
      endpoint,
      params,
      response,
      timestamp: Date.now(),
    };

    return await this.set('api', cacheKey, cacheData, 300); // 5 minutes
  }

  /**
   * Get cached API response
   */
  async getCachedAPIResponse(endpoint, params) {
    const cacheKey = this.generateAPICacheKey(endpoint, params);
    return await this.get('api', cacheKey);
  }

  /**
   * Generate cache key for AI responses
   */
  generateAICacheKey(prompt, options) {
    const keyData = {
      prompt: prompt.substring(0, 500), // First 500 chars for uniqueness
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      provider: options.provider,
    };
    
    const keyString = JSON.stringify(keyData);
    return crypto.createHash('sha256').update(keyString).digest('hex').substring(0, 32);
  }

  /**
   * Generate cache key for API responses
   */
  generateAPICacheKey(endpoint, params) {
    const keyData = {
      endpoint,
      params: this.sortObject(params),
    };
    
    const keyString = JSON.stringify(keyData);
    return crypto.createHash('md5').update(keyString).digest('hex');
  }

  /**
   * Generate prefixed cache key
   */
  generateCacheKey(cacheType, key) {
    return `${this.config.redisPrefix}${cacheType}:${key}`;
  }

  /**
   * Serialize value for storage
   */
  async serializeValue(value) {
    let serialized = JSON.stringify(value);
    
    // Compress if enabled
    if (this.config.enableCompression) {
      const zlib = require('zlib');
      serialized = zlib.gzipSync(serialized).toString('base64');
    }
    
    // Encrypt if enabled
    if (this.config.enableEncryption && this.config.encryptionKey) {
      serialized = this.encrypt(serialized);
    }
    
    return serialized;
  }

  /**
   * Deserialize value from storage
   */
  async deserializeValue(serializedValue) {
    let value = serializedValue;
    
    // Decrypt if enabled
    if (this.config.enableEncryption && this.config.encryptionKey) {
      value = this.decrypt(value);
    }
    
    // Decompress if enabled
    if (this.config.enableCompression) {
      const zlib = require('zlib');
      const buffer = Buffer.from(value, 'base64');
      value = zlib.gunzipSync(buffer).toString();
    }
    
    return JSON.parse(value);
  }

  /**
   * Encrypt data
   */
  encrypt(text) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.config.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    cipher.setAAD(Buffer.from('cache-data'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.config.encryptionKey, 'salt', 32);
    
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAAD(Buffer.from('cache-data'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Utility methods
   */
  validateCacheType(cacheType) {
    if (!this.caches[cacheType]) {
      throw new Error(`Invalid cache type: ${cacheType}`);
    }
  }

  sanitizeOptions(options) {
    // Remove sensitive data from options before caching
    const sanitized = { ...options };
    delete sanitized.apiKey;
    delete sanitized.token;
    delete sanitized.password;
    return sanitized;
  }

  isAIResponseValid(cached) {
    // Check if cached AI response is still valid
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    return (Date.now() - cached.timestamp) < maxAge;
  }

  sortObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    const sorted = {};
    Object.keys(obj).sort().forEach(key => {
      sorted[key] = this.sortObject(obj[key]);
    });
    
    return sorted;
  }

  updateCacheSize() {
    this.stats.size = Object.values(this.caches).reduce((total, cache) => {
      return total + cache.getStats().keys;
    }, 0);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    this.updateCacheSize();
    
    const cacheStats = {};
    Object.entries(this.caches).forEach(([type, cache]) => {
      cacheStats[type] = cache.getStats();
    });

    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? this.stats.hits / (this.stats.hits + this.stats.misses) 
      : 0;

    return {
      overall: {
        ...this.stats,
        hitRate,
        uptime: Date.now() - this.stats.startTime,
      },
      caches: cacheStats,
      redis: {
        enabled: this.config.enableRedis,
        connected: this.redisClient && this.redisClient.status === 'ready',
      },
      configuration: {
        compression: this.config.enableCompression,
        encryption: this.config.enableEncryption,
      },
    };
  }

  /**
   * Invalidate cache patterns
   */
  async invalidatePattern(cacheType, pattern) {
    this.validateCacheType(cacheType);
    
    try {
      const cache = this.caches[cacheType];
      const keys = cache.keys();
      
      // Create regex from pattern
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      
      // Delete matching keys
      const deletedKeys = [];
      for (const key of keys) {
        if (regex.test(key)) {
          await this.delete(cacheType, key);
          deletedKeys.push(key);
        }
      }

      this.strapi.log.info(`🗑️ Invalidated ${deletedKeys.length} cache entries matching pattern: ${pattern}`);
      return deletedKeys.length;

    } catch (error) {
      this.stats.errors++;
      this.strapi.log.error(`Cache pattern invalidation error:`, error);
      return 0;
    }
  }

  /**
   * Warm up cache with common data
   */
  async warmupCache() {
    try {
      this.strapi.log.info('🔥 Starting cache warmup...');

      // Warm up campaign cache
      const campaigns = await strapi.db.query('api::campaign.campaign').findMany({
        where: { isActive: true, isPublic: true },
        select: ['slug', 'title', 'campaignType', 'config'],
        limit: 20,
      });

      for (const campaign of campaigns) {
        await this.cacheCampaign(campaign.slug, campaign);
      }

      this.strapi.log.info(`🔥 Cache warmup completed - warmed ${campaigns.length} campaigns`);

    } catch (error) {
      this.strapi.log.error('Cache warmup error:', error);
    }
  }

  /**
   * Clean up expired entries manually
   */
  cleanup() {
    Object.values(this.caches).forEach(cache => {
      cache.flushStats();
    });
    
    this.strapi.log.debug('🧹 Cache cleanup completed');
  }

  /**
   * Get cache manager status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      redis: {
        enabled: this.config.enableRedis,
        connected: this.redisClient && this.redisClient.status === 'ready',
      },
      cacheTypes: Object.keys(this.caches),
      configuration: this.config,
      statistics: this.getStats(),
    };
  }

  /**
   * Shutdown cache manager
   */
  async shutdown() {
    try {
      if (this.redisClient) {
        await this.redisClient.quit();
      }
      
      Object.values(this.caches).forEach(cache => {
        cache.close();
      });

      this.strapi.log.info('💾 Cache Manager shutdown completed');
    } catch (error) {
      this.strapi.log.error('Cache Manager shutdown error:', error);
    }
  }
}

module.exports = { CacheManager };