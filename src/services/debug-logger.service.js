'use strict';

/**
 * Debug Logger Service
 * Logs system events, errors, and debugging information to database
 */

class DebugLogger {
  constructor() {
    this.tableName = 'system_debug';
  }

  /**
   * Log an event to the database
   */
  async log(component, action, status, details = {}, errorMessage = null, ctx = null) {
    try {
      const logData = {
        component,
        action,
        status,
        details: JSON.stringify(details),
        error_message: errorMessage,
        user_agent: ctx ? ctx.get('User-Agent') : null,
        ip_address: ctx ? this.getClientIP(ctx) : null,
        session_id: ctx ? this.generateSessionId(ctx) : null,
        timestamp: new Date()
      };

      // Insert directly via knex to avoid Strapi overhead
      const knex = strapi.db.connection;
      await knex(this.tableName).insert(logData);

      // Also log to console for immediate visibility
      strapi.log.info(`[DEBUG] ${component}:${action} - ${status}`, details);
    } catch (error) {
      // Fallback to console if database logging fails
      strapi.log.error('[DEBUG-LOGGER] Failed to log to database:', error);
      strapi.log.info(`[DEBUG] ${component}:${action} - ${status}`, details);
    }
  }

  /**
   * Log API request/response
   */
  async logAPI(ctx, endpoint, response, error = null) {
    const details = {
      endpoint,
      method: ctx.method,
      query: ctx.query,
      body: ctx.request.body,
      responseStatus: ctx.status,
      responseSize: JSON.stringify(response || {}).length,
      processingTime: Date.now() - (ctx.startTime || Date.now())
    };

    await this.log(
      'API',
      endpoint,
      error ? 'ERROR' : 'SUCCESS',
      details,
      error ? error.message : null,
      ctx
    );
  }

  /**
   * Log Campaign-related events
   */
  async logCampaign(action, campaignSlug, details = {}, status = 'INFO', error = null, ctx = null) {
    await this.log(
      'CAMPAIGN',
      action,
      status,
      { slug: campaignSlug, ...details },
      error ? error.message : null,
      ctx
    );
  }

  /**
   * Log Lead-related events
   */
  async logLead(action, leadId, details = {}, status = 'INFO', error = null, ctx = null) {
    await this.log(
      'LEAD',
      action,
      status,
      { leadId, ...details },
      error ? error.message : null,
      ctx
    );
  }

  /**
   * Log Deployment/System events
   */
  async logSystem(action, details = {}, status = 'INFO', error = null) {
    await this.log(
      'SYSTEM',
      action,
      status,
      details,
      error ? error.message : null,
      null
    );
  }

  /**
   * Get latest debug logs
   */
  async getRecentLogs(component = null, limit = 50) {
    try {
      const knex = strapi.db.connection;
      let query = knex(this.tableName)
        .select('*')
        .orderBy('timestamp', 'desc')
        .limit(limit);

      if (component) {
        query = query.where('component', component);
      }

      return await query;
    } catch (error) {
      strapi.log.error('[DEBUG-LOGGER] Failed to fetch logs:', error);
      return [];
    }
  }

  /**
   * Get error summary
   */
  async getErrorSummary(hours = 24) {
    try {
      const knex = strapi.db.connection;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      return await knex(this.tableName)
        .select('component', 'action', 'status')
        .count('* as count')
        .where('timestamp', '>=', since)
        .where('status', 'ERROR')
        .groupBy(['component', 'action', 'status'])
        .orderBy('count', 'desc');
    } catch (error) {
      strapi.log.error('[DEBUG-LOGGER] Failed to get error summary:', error);
      return [];
    }
  }

  /**
   * Helper methods
   */
  getClientIP(ctx) {
    return ctx.request.ip || 
           ctx.get('X-Forwarded-For') || 
           ctx.get('X-Real-IP') || 
           'unknown';
  }

  generateSessionId(ctx) {
    const userAgent = ctx.get('User-Agent') || '';
    const ip = this.getClientIP(ctx);
    return require('crypto')
      .createHash('md5')
      .update(`${ip}-${userAgent}-${Date.now()}`)
      .digest('hex')
      .substring(0, 16);
  }
}

module.exports = new DebugLogger();