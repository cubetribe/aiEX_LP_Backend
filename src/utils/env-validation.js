/**
 * Environment Variables Validation
 * Validates required environment variables for GoAIX Platform
 */

'use strict';

const Joi = require('joi');

/**
 * Environment validation schema
 */
const envSchema = Joi.object({
  // Application settings
  NODE_ENV: Joi.string().valid('development', 'staging', 'production').default('development'),
  HOST: Joi.string().default('0.0.0.0'),
  PORT: Joi.number().port().default(1337),
  STRAPI_URL: Joi.string().uri().required(),

  // Security keys
  APP_KEYS: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  API_TOKEN_SALT: Joi.string().min(32).required(),
  ADMIN_JWT_SECRET: Joi.string().min(32).required(),
  TRANSFER_TOKEN_SALT: Joi.string().min(32).required(),

  // Database configuration
  DATABASE_CLIENT: Joi.string().valid('postgres').default('postgres'),
  DATABASE_HOST: Joi.string().default('localhost'),
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_USERNAME: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_SSL: Joi.boolean().default(false),
  DATABASE_POOL_MIN: Joi.number().min(1).default(2),
  DATABASE_POOL_MAX: Joi.number().min(1).default(10),

  // Redis configuration
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_DB: Joi.number().min(0).default(0),
  
  // Queue Redis (can be separate instance)
  QUEUE_REDIS_HOST: Joi.string().default(Joi.ref('REDIS_HOST')),
  QUEUE_REDIS_PORT: Joi.number().port().default(Joi.ref('REDIS_PORT')),
  QUEUE_REDIS_PASSWORD: Joi.string().optional(),
  QUEUE_REDIS_DB: Joi.number().min(0).default(1),

  // AI Providers (at least one required)
  OPENAI_API_KEY: Joi.string().optional(),
  CLAUDE_API_KEY: Joi.string().optional(),
  GEMINI_API_KEY: Joi.string().optional(),
  DEFAULT_AI_PROVIDER: Joi.string().valid('openai', 'claude', 'gemini').default('openai'),
  AI_FALLBACK_ORDER: Joi.string().default('openai,claude,gemini'),

  // Google Services
  GOOGLE_SERVICE_ACCOUNT_PATH: Joi.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_JSON: Joi.string().optional(),
  DEFAULT_GOOGLE_SHEET_TEMPLATE_ID: Joi.string().optional(),

  // Email configuration
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),
  EMAIL_FROM_NAME: Joi.string().default('GoAIX Quiz Platform'),
  EMAIL_FROM_ADDRESS: Joi.string().email().default('noreply@quiz.goaiex.com'),

  // Queue configuration
  QUEUE_CONCURRENCY: Joi.number().min(1).default(5),
  QUEUE_MAX_ATTEMPTS: Joi.number().min(1).default(3),
  QUEUE_BACKOFF_DELAY: Joi.number().min(1000).default(5000),
  QUEUE_DASHBOARD_ENABLED: Joi.boolean().default(false),

  // CORS configuration
  CORS_ORIGINS: Joi.string().default('http://localhost:3000,https://quiz.goaiex.com'),
  ADDITIONAL_CORS_ORIGINS: Joi.string().optional(),

  // Security
  RATE_LIMIT_MAX: Joi.number().min(1).default(100),
  RATE_LIMIT_INTERVAL: Joi.number().min(1000).default(60000),
  SESSION_SECRET: Joi.string().min(32).required(),

  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'verbose', 'debug', 'silly').default('info'),
  LOG_CONSOLE: Joi.boolean().default(true),
  LOG_FILE_ERROR: Joi.string().default('logs/error.log'),
  LOG_FILE_COMBINED: Joi.string().default('logs/combined.log'),

  // SSL configuration (production)
  SSL_ENABLED: Joi.boolean().default(false),
  SSL_KEY_PATH: Joi.string().optional(),
  SSL_CERT_PATH: Joi.string().optional(),

  // Feature flags
  AUTO_CREATE_SHEETS: Joi.boolean().default(false),
  ANALYTICS_ENABLED: Joi.boolean().default(true),
  MONITORING_ENABLED: Joi.boolean().default(false),
  HEALTH_CHECK_ENABLED: Joi.boolean().default(true),

  // External services
  SENTRY_DSN: Joi.string().uri().optional(),
  GOOGLE_ANALYTICS_ID: Joi.string().optional(),
  SLACK_WEBHOOK_URL: Joi.string().uri().optional(),

  // Maintenance
  MAINTENANCE_MODE: Joi.boolean().default(false),
  MAINTENANCE_MESSAGE: Joi.string().optional(),
  MAINTENANCE_ALLOWED_IPS: Joi.string().optional(),

}).unknown(true); // Allow additional environment variables

/**
 * Validate environment variables
 * @param {Object} env - Environment variables object (process.env)
 * @returns {Object} Validation result
 */
function validateEnvironment(env = process.env) {
  const { error, value, warning } = envSchema.validate(env, {
    abortEarly: false,
    stripUnknown: false,
  });

  return {
    isValid: !error,
    error,
    value,
    warning,
  };
}

/**
 * Validate required AI provider configuration
 * @param {Object} env - Environment variables
 * @returns {Object} Validation result
 */
function validateAIProviders(env) {
  const providers = {
    openai: !!env.OPENAI_API_KEY,
    claude: !!env.CLAUDE_API_KEY,
    gemini: !!env.GEMINI_API_KEY,
  };

  const availableProviders = Object.entries(providers)
    .filter(([_, hasKey]) => hasKey)
    .map(([provider]) => provider);

  const isValid = availableProviders.length > 0;
  const defaultProvider = env.DEFAULT_AI_PROVIDER || 'openai';
  const isDefaultAvailable = providers[defaultProvider];

  return {
    isValid,
    availableProviders,
    defaultProvider,
    isDefaultAvailable,
    message: isValid 
      ? `AI providers available: ${availableProviders.join(', ')}`
      : 'No AI provider keys configured. Set at least one: OPENAI_API_KEY, CLAUDE_API_KEY, or GEMINI_API_KEY',
  };
}

/**
 * Validate Google Sheets configuration
 * @param {Object} env - Environment variables
 * @returns {Object} Validation result
 */
function validateGoogleSheets(env) {
  const hasPath = !!env.GOOGLE_SERVICE_ACCOUNT_PATH;
  const hasJson = !!env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const isConfigured = hasPath || hasJson;

  return {
    isConfigured,
    hasPath,
    hasJson,
    message: isConfigured 
      ? 'Google Sheets integration configured'
      : 'Google Sheets integration not configured. Set GOOGLE_SERVICE_ACCOUNT_PATH or GOOGLE_SERVICE_ACCOUNT_JSON',
  };
}

/**
 * Validate production-specific requirements
 * @param {Object} env - Environment variables
 * @returns {Object} Validation result
 */
function validateProductionRequirements(env) {
  const isProduction = env.NODE_ENV === 'production';
  const errors = [];
  const warnings = [];

  if (isProduction) {
    // Required for production
    if (!env.DATABASE_SSL && env.DATABASE_HOST && !env.DATABASE_HOST.includes('localhost')) {
      warnings.push('DATABASE_SSL should be enabled for production database connections');
    }

    if (!env.SSL_ENABLED && env.STRAPI_URL && env.STRAPI_URL.startsWith('https://')) {
      warnings.push('SSL_ENABLED should be true when using HTTPS URLs');
    }

    if (env.LOG_LEVEL === 'debug' || env.LOG_LEVEL === 'silly') {
      warnings.push('Log level should not be debug/silly in production');
    }

    if (!env.SENTRY_DSN) {
      warnings.push('Consider setting up error tracking with SENTRY_DSN for production');
    }

    // Security checks
    const requiredSecrets = ['JWT_SECRET', 'API_TOKEN_SALT', 'ADMIN_JWT_SECRET', 'TRANSFER_TOKEN_SALT', 'SESSION_SECRET'];
    requiredSecrets.forEach(secret => {
      if (!env[secret] || env[secret].length < 32) {
        errors.push(`${secret} must be at least 32 characters long in production`);
      }
    });

    if (env.CORS_ORIGINS && env.CORS_ORIGINS.includes('localhost')) {
      warnings.push('CORS_ORIGINS contains localhost URLs in production');
    }
  }

  return {
    isProduction,
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Generate comprehensive environment validation report
 * @param {Object} env - Environment variables
 * @returns {Object} Complete validation report
 */
function generateValidationReport(env = process.env) {
  const envValidation = validateEnvironment(env);
  const aiValidation = validateAIProviders(env);
  const sheetsValidation = validateGoogleSheets(env);
  const productionValidation = validateProductionRequirements(env);

  const report = {
    isValid: envValidation.isValid && aiValidation.isValid && productionValidation.isValid,
    environment: {
      nodeEnv: env.NODE_ENV || 'development',
      strapiUrl: env.STRAPI_URL,
      isProduction: productionValidation.isProduction,
    },
    validation: {
      environment: envValidation,
      aiProviders: aiValidation,
      googleSheets: sheetsValidation,
      production: productionValidation,
    },
    summary: {
      totalErrors: (envValidation.error?.details?.length || 0) + productionValidation.errors.length,
      totalWarnings: productionValidation.warnings.length,
      criticalIssues: [],
    },
  };

  // Collect critical issues
  if (!aiValidation.isValid) {
    report.summary.criticalIssues.push('No AI provider configured');
  }
  if (envValidation.error) {
    report.summary.criticalIssues.push('Invalid environment configuration');
  }
  if (!productionValidation.isValid && productionValidation.isProduction) {
    report.summary.criticalIssues.push('Production security requirements not met');
  }

  return report;
}

/**
 * Log validation report in a readable format
 * @param {Object} report - Validation report
 * @param {Object} logger - Logger instance
 */
function logValidationReport(report, logger = console) {
  const { isValid, environment, validation, summary } = report;

  logger.log('\n🔧 Environment Validation Report');
  logger.log('================================');
  
  logger.log(`Environment: ${environment.nodeEnv}`);
  logger.log(`Strapi URL: ${environment.strapiUrl}`);
  logger.log(`Status: ${isValid ? '✅ Valid' : '❌ Invalid'}`);

  if (summary.criticalIssues.length > 0) {
    logger.log('\n🚨 Critical Issues:');
    summary.criticalIssues.forEach(issue => logger.log(`  - ${issue}`));
  }

  // AI Providers
  logger.log(`\n🤖 AI Providers: ${validation.aiProviders.message}`);
  if (validation.aiProviders.isValid) {
    logger.log(`  Default: ${validation.aiProviders.defaultProvider}`);
    logger.log(`  Available: ${validation.aiProviders.availableProviders.join(', ')}`);
  }

  // Google Sheets
  logger.log(`\n📊 Google Sheets: ${validation.googleSheets.message}`);

  // Errors
  if (validation.environment.error) {
    logger.log('\n❌ Environment Errors:');
    validation.environment.error.details.forEach(detail => {
      logger.log(`  - ${detail.path.join('.')}: ${detail.message}`);
    });
  }

  // Production warnings
  if (validation.production.warnings.length > 0) {
    logger.log('\n⚠️ Production Warnings:');
    validation.production.warnings.forEach(warning => logger.log(`  - ${warning}`));
  }

  // Production errors
  if (validation.production.errors.length > 0) {
    logger.log('\n❌ Production Errors:');
    validation.production.errors.forEach(error => logger.log(`  - ${error}`));
  }

  logger.log('\n================================\n');
}

module.exports = {
  validateEnvironment,
  validateAIProviders,
  validateGoogleSheets,
  validateProductionRequirements,
  generateValidationReport,
  logValidationReport,
};