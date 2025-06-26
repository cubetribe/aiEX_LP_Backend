/**
 * Performance Monitoring Service
 * Monitors AI processing performance, costs, and system health
 */

'use strict';

/**
 * Performance Monitor Service
 * Tracks metrics, costs, and performance across the GoAIX platform
 */
class PerformanceMonitor {
  constructor(strapi) {
    this.strapi = strapi;
    this.isInitialized = false;
    
    // Performance metrics storage
    this.metrics = {
      ai: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalCost: 0,
        averageResponseTime: 0,
        providerMetrics: {},
      },
      api: {
        requestCount: 0,
        averageResponseTime: 0,
        errorRate: 0,
        endpoints: {},
      },
      system: {
        uptime: 0,
        memoryUsage: {},
        cpuUsage: 0,
        healthChecks: {},
      },
      campaigns: {
        totalLeads: 0,
        processingQueue: 0,
        conversionRate: 0,
        campaignMetrics: {},
      },
    };

    // Performance tracking
    this.performanceData = {
      responseTimeHistory: [],
      errorHistory: [],
      costHistory: [],
      memoryHistory: [],
    };

    // Monitoring configuration
    this.config = {
      metricsRetentionDays: parseInt(process.env.METRICS_RETENTION_DAYS) || 30,
      performanceThresholds: {
        maxResponseTime: parseInt(process.env.MAX_RESPONSE_TIME) || 5000,
        maxErrorRate: parseFloat(process.env.MAX_ERROR_RATE) || 0.05,
        maxMemoryUsage: parseFloat(process.env.MAX_MEMORY_USAGE) || 0.85,
      },
      alerting: {
        enabled: process.env.ALERTING_ENABLED === 'true',
        webhookUrl: process.env.ALERT_WEBHOOK_URL,
      },
    };

    // Start time for uptime calculation
    this.startTime = Date.now();
  }

  /**
   * Initialize the performance monitor
   */
  async initialize() {
    try {
      this.strapi.log.info('📊 Initializing Performance Monitor...');

      // Start periodic monitoring
      this.startPeriodicMonitoring();

      // Setup request interceptors
      this.setupRequestMonitoring();

      // Initialize provider metrics
      this.initializeProviderMetrics();

      this.isInitialized = true;
      this.strapi.log.info('✅ Performance Monitor initialized');

      return true;
    } catch (error) {
      this.strapi.log.error('❌ Failed to initialize Performance Monitor:', error);
      throw error;
    }
  }

  /**
   * Start periodic monitoring of system metrics
   */
  startPeriodicMonitoring() {
    // Monitor system health every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Monitor AI service health every 60 seconds
    setInterval(() => {
      this.monitorAIServices();
    }, 60000);

    // Clean up old metrics every hour
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 3600000);

    // Generate performance reports every 15 minutes
    setInterval(() => {
      this.generatePerformanceReport();
    }, 900000);
  }

  /**
   * Setup request monitoring middleware
   */
  setupRequestMonitoring() {
    // This would typically be done through Strapi middleware
    // For now, we'll provide methods that can be called from controllers
  }

  /**
   * Initialize provider-specific metrics
   */
  initializeProviderMetrics() {
    const providers = ['openai', 'claude', 'gemini'];
    
    providers.forEach(provider => {
      this.metrics.ai.providerMetrics[provider] = {
        requests: 0,
        successes: 0,
        failures: 0,
        totalCost: 0,
        averageResponseTime: 0,
        totalTokens: 0,
        lastUsed: null,
      };
    });
  }

  /**
   * Track AI request metrics
   */
  trackAIRequest(provider, startTime, success, cost = 0, tokens = 0, error = null) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Update overall AI metrics
    this.metrics.ai.totalRequests++;
    if (success) {
      this.metrics.ai.successfulRequests++;
    } else {
      this.metrics.ai.failedRequests++;
    }

    this.metrics.ai.totalCost += cost;
    this.metrics.ai.averageResponseTime = this.calculateMovingAverage(
      this.metrics.ai.averageResponseTime,
      responseTime,
      this.metrics.ai.totalRequests
    );

    // Update provider-specific metrics
    const providerMetrics = this.metrics.ai.providerMetrics[provider];
    if (providerMetrics) {
      providerMetrics.requests++;
      if (success) {
        providerMetrics.successes++;
      } else {
        providerMetrics.failures++;
      }
      providerMetrics.totalCost += cost;
      providerMetrics.totalTokens += tokens;
      providerMetrics.lastUsed = new Date().toISOString();
      providerMetrics.averageResponseTime = this.calculateMovingAverage(
        providerMetrics.averageResponseTime,
        responseTime,
        providerMetrics.requests
      );
    }

    // Track performance history
    this.performanceData.responseTimeHistory.push({
      timestamp: endTime,
      provider,
      responseTime,
      success,
    });

    if (!success && error) {
      this.performanceData.errorHistory.push({
        timestamp: endTime,
        provider,
        error: error.message,
        type: error.type || 'unknown',
      });
    }

    if (cost > 0) {
      this.performanceData.costHistory.push({
        timestamp: endTime,
        provider,
        cost,
        tokens,
      });
    }

    // Check performance thresholds
    this.checkPerformanceThresholds(provider, responseTime, success);
  }

  /**
   * Track API endpoint performance
   */
  trackAPIRequest(endpoint, method, startTime, statusCode) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Update overall API metrics
    this.metrics.api.requestCount++;
    this.metrics.api.averageResponseTime = this.calculateMovingAverage(
      this.metrics.api.averageResponseTime,
      responseTime,
      this.metrics.api.requestCount
    );

    // Track error rate
    if (statusCode >= 400) {
      this.metrics.api.errorRate = this.calculateMovingAverage(
        this.metrics.api.errorRate,
        1,
        this.metrics.api.requestCount
      );
    } else {
      this.metrics.api.errorRate = this.calculateMovingAverage(
        this.metrics.api.errorRate,
        0,
        this.metrics.api.requestCount
      );
    }

    // Update endpoint-specific metrics
    const endpointKey = `${method} ${endpoint}`;
    if (!this.metrics.api.endpoints[endpointKey]) {
      this.metrics.api.endpoints[endpointKey] = {
        requests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        lastAccessed: null,
      };
    }

    const endpointMetrics = this.metrics.api.endpoints[endpointKey];
    endpointMetrics.requests++;
    endpointMetrics.lastAccessed = new Date().toISOString();
    endpointMetrics.averageResponseTime = this.calculateMovingAverage(
      endpointMetrics.averageResponseTime,
      responseTime,
      endpointMetrics.requests
    );

    if (statusCode >= 400) {
      endpointMetrics.errorRate = this.calculateMovingAverage(
        endpointMetrics.errorRate,
        1,
        endpointMetrics.requests
      );
    } else {
      endpointMetrics.errorRate = this.calculateMovingAverage(
        endpointMetrics.errorRate,
        0,
        endpointMetrics.requests
      );
    }
  }

  /**
   * Collect system metrics
   */
  async collectSystemMetrics() {
    try {
      // Memory usage
      const memUsage = process.memoryUsage();
      this.metrics.system.memoryUsage = {
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers,
      };

      // CPU usage (simplified)
      this.metrics.system.cpuUsage = process.cpuUsage();

      // Uptime
      this.metrics.system.uptime = Date.now() - this.startTime;

      // Track memory history
      this.performanceData.memoryHistory.push({
        timestamp: Date.now(),
        ...this.metrics.system.memoryUsage,
      });

      // Check system health
      await this.checkSystemHealth();

    } catch (error) {
      this.strapi.log.error('Error collecting system metrics:', error);
    }
  }

  /**
   * Monitor AI services health
   */
  async monitorAIServices() {
    try {
      const aiService = strapi.service('api::ai-orchestrator.ai-orchestrator');
      if (aiService) {
        const status = aiService.getStatus();
        this.metrics.system.healthChecks.aiOrchestrator = {
          healthy: status.initialized,
          providers: status.totalProviders,
          lastCheck: new Date().toISOString(),
        };
      }

      // Monitor campaign processing service
      const campaignService = strapi.service('api::campaign-processing.campaign-processing');
      if (campaignService) {
        const status = campaignService.getStatus();
        this.metrics.system.healthChecks.campaignProcessing = {
          healthy: status.initialized,
          totalProcessed: status.metrics.totalProcessed,
          lastCheck: new Date().toISOString(),
        };
      }

      // Monitor queue health
      const queueService = strapi.service('api::queue.queue');
      if (queueService) {
        // This would need to be implemented in the queue service
        this.metrics.system.healthChecks.queueService = {
          healthy: true,
          lastCheck: new Date().toISOString(),
        };
      }

    } catch (error) {
      this.strapi.log.error('Error monitoring AI services:', error);
    }
  }

  /**
   * Check performance thresholds and alert if necessary
   */
  checkPerformanceThresholds(provider, responseTime, success) {
    const alerts = [];

    // Check response time threshold
    if (responseTime > this.config.performanceThresholds.maxResponseTime) {
      alerts.push({
        type: 'performance',
        provider,
        metric: 'responseTime',
        value: responseTime,
        threshold: this.config.performanceThresholds.maxResponseTime,
        severity: 'warning',
      });
    }

    // Check error rate threshold
    const providerMetrics = this.metrics.ai.providerMetrics[provider];
    if (providerMetrics) {
      const errorRate = 1 - (providerMetrics.successes / providerMetrics.requests);
      if (errorRate > this.config.performanceThresholds.maxErrorRate) {
        alerts.push({
          type: 'error_rate',
          provider,
          metric: 'errorRate',
          value: errorRate,
          threshold: this.config.performanceThresholds.maxErrorRate,
          severity: 'critical',
        });
      }
    }

    // Send alerts if any
    if (alerts.length > 0) {
      this.sendAlerts(alerts);
    }
  }

  /**
   * Check overall system health
   */
  async checkSystemHealth() {
    const alerts = [];

    // Check memory usage
    const memoryUsage = this.metrics.system.memoryUsage.heapUsed / this.metrics.system.memoryUsage.heapTotal;
    if (memoryUsage > this.config.performanceThresholds.maxMemoryUsage) {
      alerts.push({
        type: 'system',
        metric: 'memoryUsage',
        value: memoryUsage,
        threshold: this.config.performanceThresholds.maxMemoryUsage,
        severity: 'warning',
      });
    }

    // Check database connectivity
    try {
      await strapi.db.connection.raw('SELECT 1');
      this.metrics.system.healthChecks.database = {
        healthy: true,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      this.metrics.system.healthChecks.database = {
        healthy: false,
        error: error.message,
        lastCheck: new Date().toISOString(),
      };
      alerts.push({
        type: 'system',
        metric: 'database',
        value: 'disconnected',
        severity: 'critical',
      });
    }

    // Send alerts if any
    if (alerts.length > 0) {
      this.sendAlerts(alerts);
    }
  }

  /**
   * Send performance alerts
   */
  async sendAlerts(alerts) {
    if (!this.config.alerting.enabled) {
      return;
    }

    try {
      for (const alert of alerts) {
        this.strapi.log.warn(`Performance Alert: ${alert.type} - ${alert.metric}`, alert);
        
        // Send webhook notification if configured
        if (this.config.alerting.webhookUrl) {
          // Implementation would depend on webhook service
          // await this.sendWebhookAlert(alert);
        }
      }
    } catch (error) {
      this.strapi.log.error('Error sending alerts:', error);
    }
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      period: '15 minutes',
      summary: {
        totalAIRequests: this.metrics.ai.totalRequests,
        aiSuccessRate: this.metrics.ai.totalRequests > 0 
          ? this.metrics.ai.successfulRequests / this.metrics.ai.totalRequests 
          : 0,
        averageAIResponseTime: this.metrics.ai.averageResponseTime,
        totalAICost: this.metrics.ai.totalCost,
        apiRequestCount: this.metrics.api.requestCount,
        apiErrorRate: this.metrics.api.errorRate,
        systemUptime: this.metrics.system.uptime,
      },
      providers: this.metrics.ai.providerMetrics,
      systemHealth: this.metrics.system.healthChecks,
    };

    this.strapi.log.info('📊 Performance Report Generated', report.summary);
    
    // Store report for historical analysis
    this.storePerformanceReport(report);
  }

  /**
   * Store performance report
   */
  async storePerformanceReport(report) {
    try {
      // This could be stored in database, file system, or external monitoring service
      // For now, we'll just log it
      this.strapi.log.debug('Performance report stored', report);
    } catch (error) {
      this.strapi.log.error('Error storing performance report:', error);
    }
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  cleanupOldMetrics() {
    const cutoffTime = Date.now() - (this.config.metricsRetentionDays * 24 * 60 * 60 * 1000);

    // Clean up response time history
    this.performanceData.responseTimeHistory = this.performanceData.responseTimeHistory
      .filter(entry => entry.timestamp > cutoffTime);

    // Clean up error history
    this.performanceData.errorHistory = this.performanceData.errorHistory
      .filter(entry => entry.timestamp > cutoffTime);

    // Clean up cost history
    this.performanceData.costHistory = this.performanceData.costHistory
      .filter(entry => entry.timestamp > cutoffTime);

    // Clean up memory history
    this.performanceData.memoryHistory = this.performanceData.memoryHistory
      .filter(entry => entry.timestamp > cutoffTime);

    this.strapi.log.debug('🧹 Old metrics cleaned up');
  }

  /**
   * Calculate moving average
   */
  calculateMovingAverage(currentAverage, newValue, count) {
    if (count === 1) {
      return newValue;
    }
    return ((currentAverage * (count - 1)) + newValue) / count;
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      performanceData: {
        responseTimeHistory: this.performanceData.responseTimeHistory.slice(-100), // Last 100 entries
        errorHistory: this.performanceData.errorHistory.slice(-50), // Last 50 errors
        costHistory: this.performanceData.costHistory.slice(-100), // Last 100 cost entries
        memoryHistory: this.performanceData.memoryHistory.slice(-100), // Last 100 memory entries
      },
    };
  }

  /**
   * Get performance analytics
   */
  getAnalytics(timeRange = '1h') {
    const now = Date.now();
    let cutoffTime;

    switch (timeRange) {
      case '1h':
        cutoffTime = now - (60 * 60 * 1000);
        break;
      case '24h':
        cutoffTime = now - (24 * 60 * 60 * 1000);
        break;
      case '7d':
        cutoffTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffTime = now - (60 * 60 * 1000);
    }

    // Filter data by time range
    const filteredResponseTimes = this.performanceData.responseTimeHistory
      .filter(entry => entry.timestamp > cutoffTime);

    const filteredErrors = this.performanceData.errorHistory
      .filter(entry => entry.timestamp > cutoffTime);

    const filteredCosts = this.performanceData.costHistory
      .filter(entry => entry.timestamp > cutoffTime);

    // Calculate analytics
    const analytics = {
      timeRange,
      period: {
        start: new Date(cutoffTime).toISOString(),
        end: new Date(now).toISOString(),
      },
      performance: {
        averageResponseTime: this.calculateAverage(filteredResponseTimes.map(e => e.responseTime)),
        p95ResponseTime: this.calculatePercentile(filteredResponseTimes.map(e => e.responseTime), 95),
        totalRequests: filteredResponseTimes.length,
        successRate: filteredResponseTimes.length > 0 
          ? filteredResponseTimes.filter(e => e.success).length / filteredResponseTimes.length 
          : 0,
      },
      costs: {
        totalCost: filteredCosts.reduce((sum, entry) => sum + entry.cost, 0),
        averageCostPerRequest: this.calculateAverage(filteredCosts.map(e => e.cost)),
        costByProvider: this.groupBy(filteredCosts, 'provider'),
      },
      errors: {
        totalErrors: filteredErrors.length,
        errorsByType: this.groupBy(filteredErrors, 'type'),
        errorsByProvider: this.groupBy(filteredErrors, 'provider'),
      },
    };

    return analytics;
  }

  /**
   * Utility methods
   */
  calculateAverage(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key] || 'unknown';
      groups[group] = (groups[group] || 0) + 1;
      return groups;
    }, {});
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics() {
    this.metrics = {
      ai: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalCost: 0,
        averageResponseTime: 0,
        providerMetrics: {},
      },
      api: {
        requestCount: 0,
        averageResponseTime: 0,
        errorRate: 0,
        endpoints: {},
      },
      system: {
        uptime: 0,
        memoryUsage: {},
        cpuUsage: 0,
        healthChecks: {},
      },
      campaigns: {
        totalLeads: 0,
        processingQueue: 0,
        conversionRate: 0,
        campaignMetrics: {},
      },
    };

    this.performanceData = {
      responseTimeHistory: [],
      errorHistory: [],
      costHistory: [],
      memoryHistory: [],
    };

    this.initializeProviderMetrics();
  }

  /**
   * Get monitor status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      startTime: this.startTime,
      uptime: Date.now() - this.startTime,
      configuration: this.config,
      metricsCount: {
        responseTimeHistory: this.performanceData.responseTimeHistory.length,
        errorHistory: this.performanceData.errorHistory.length,
        costHistory: this.performanceData.costHistory.length,
        memoryHistory: this.performanceData.memoryHistory.length,
      },
    };
  }
}

module.exports = { PerformanceMonitor };