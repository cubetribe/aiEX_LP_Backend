/**
 * Middlewares Configuration
 * GoAIX Platform - Middleware stack for quiz.goaiex.com
 */

module.exports = [
  // Error handling middleware (first in stack)
  'strapi::errors',
  
  // Security middleware with custom configuration
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': [
            "'self'", 
            'https:', 
            'https://quiz.goaiex.com',
            'https://api.quiz.goaiex.com',
            'https://api.openai.com',
            'https://api.anthropic.com',
            'https://generativelanguage.googleapis.com',
            'https://sheets.googleapis.com',
            'https://accounts.google.com'
          ],
          'img-src': [
            "'self'", 
            'data:', 
            'blob:', 
            'https:', 
            'https://quiz.goaiex.com',
            'https://res.cloudinary.com',
            'https://images.unsplash.com'
          ],
          'media-src': [
            "'self'", 
            'data:', 
            'blob:', 
            'https://quiz.goaiex.com'
          ],
          'frame-src': [
            "'self'", 
            'https://quiz.goaiex.com'
          ],
          'style-src': [
            "'self'", 
            "'unsafe-inline'", // Allow inline styles for dynamic CSS
            'https://fonts.googleapis.com'
          ],
          'font-src': [
            "'self'", 
            'https://fonts.gstatic.com'
          ],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: {
        policy: 'cross-origin'
      },
      frameguard: {
        action: 'sameorigin'
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    },
  },

  // CORS middleware with quiz.goaiex.com configuration
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      headers: '*',
      origin: [
        'http://localhost:3000',           // Development
        'http://localhost:3001',           // Alternative dev port
        'http://localhost:8000',           // Admin dev port
        'https://quiz.goaiex.com',         // Production frontend
        'https://www.quiz.goaiex.com',     // Production frontend with www
        'https://api.quiz.goaiex.com',     // API domain
        'https://admin.quiz.goaiex.com',   // Admin panel
        ...(process.env.ADDITIONAL_CORS_ORIGINS 
          ? process.env.ADDITIONAL_CORS_ORIGINS.split(',').filter(Boolean) 
          : [])
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Frame-Options',
        'Access-Control-Allow-Origin',
        'X-Requested-With',
        'Accept',
        'Origin',
        'DNT',
        'X-CustomHeader',
        'Keep-Alive',
        'User-Agent',
        'If-Modified-Since',
        'Cache-Control',
        'Content-Range',
        'Range'
      ],
      exposedHeaders: [
        'Content-Range',
        'X-Content-Range',
        'X-Total-Count'
      ],
    },
  },

  // Remove or customize powered-by header
  {
    name: 'strapi::poweredBy',
    config: {
      poweredBy: 'GoAIX Platform <quiz.goaiex.com>',
    },
  },

  // Request logging middleware
  'strapi::logger',

  // Query parsing middleware
  'strapi::query',

  // Request body parsing
  {
    name: 'strapi::body',
    config: {
      enabled: true,
      multipart: true,
      includeUnparsed: true,
      formidable: {
        maxFileSize: 50 * 1024 * 1024, // 50MB
        maxFields: 1000,
        maxFieldsSize: 20 * 1024 * 1024, // 20MB
        allowEmptyFiles: false,
        minFileSize: 1,
      },
      jsonLimit: '50mb',
      formLimit: '50mb',
      textLimit: '50mb',
    },
  },

  // Session middleware
  'strapi::session',

  // Favicon middleware
  'strapi::favicon',

  // Static file serving
  'strapi::public',

  // Custom rate limiting middleware
  {
    name: 'global::rate-limit',
    config: {
      interval: process.env.RATE_LIMIT_INTERVAL || 60000, // 1 minute
      max: process.env.RATE_LIMIT_MAX || 100,
      delayAfter: process.env.RATE_LIMIT_DELAY_AFTER || 50,
      delayMs: process.env.RATE_LIMIT_DELAY_MS || 500,
      skipSuccessfulRequests: true,
      skipFailedRequests: false,
      keyGenerator: function (request) {
        return request.ip || request.connection.remoteAddress;
      },
      skip: function (request) {
        // Skip rate limiting for health checks
        return request.url === '/health' || request.url === '/_health';
      },
      message: {
        error: 'Zu viele Anfragen, bitte versuchen Sie es später erneut.',
        statusCode: 429,
      },
    },
  },

  // Request timeout middleware
  {
    name: 'global::timeout',
    config: {
      timeout: process.env.REQUEST_TIMEOUT || 30000, // 30 seconds
      message: 'Request timeout - bitte versuchen Sie es erneut',
    },
  },

  // Compression middleware for better performance
  {
    name: 'global::compression',
    config: {
      enabled: process.env.COMPRESSION_ENABLED !== 'false',
      threshold: 1024, // Only compress responses larger than 1KB
      level: 6, // Compression level (1-9)
      chunkSize: 1024,
      windowBits: 15,
      memLevel: 8,
      filter: function (contentType) {
        // Compress text-based content types
        return /text|javascript|json|css|xml|svg/.test(contentType);
      },
    },
  },

  // Request tracking middleware for analytics
  {
    name: 'global::analytics',
    config: {
      enabled: process.env.ANALYTICS_ENABLED !== 'false',
      trackCampaignSubmissions: true,
      trackAPIUsage: true,
      excludePaths: ['/health', '/admin', '/_health'],
    },
  },

  // IP geolocation middleware
  {
    name: 'global::geolocation',
    config: {
      enabled: process.env.GEOLOCATION_ENABLED !== 'false',
      provider: process.env.GEOLOCATION_PROVIDER || 'ipapi',
      apiKey: process.env.GEOLOCATION_API_KEY,
      addToContext: true,
    },
  },

  // Campaign-specific middleware
  {
    name: 'global::campaign-context',
    config: {
      enabled: true,
      extractSlugFromPath: true,
      validateCampaignAccess: true,
      trackCampaignMetrics: true,
    },
  },

  // API versioning middleware
  {
    name: 'global::api-versioning',
    config: {
      enabled: true,
      defaultVersion: 'v1',
      supportedVersions: ['v1'],
      headerName: 'X-API-Version',
    },
  },

  // Response time tracking
  {
    name: 'global::response-time',
    config: {
      enabled: process.env.RESPONSE_TIME_TRACKING !== 'false',
      headerName: 'X-Response-Time',
      logSlowRequests: true,
      slowRequestThreshold: 1000, // 1 second
    },
  },

  // Health check middleware
  {
    name: 'global::health-check',
    config: {
      enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
      endpoint: process.env.HEALTH_CHECK_ENDPOINT || '/health',
      checks: {
        database: true,
        redis: true,
        queues: true,
        externalServices: false, // AI services might be slow
      },
    },
  },

  // Maintenance mode middleware
  {
    name: 'global::maintenance',
    config: {
      enabled: process.env.MAINTENANCE_MODE === 'true',
      message: process.env.MAINTENANCE_MESSAGE || 'Die Plattform wird derzeit gewartet.',
      allowedIPs: process.env.MAINTENANCE_ALLOWED_IPS 
        ? process.env.MAINTENANCE_ALLOWED_IPS.split(',') 
        : [],
      bypassPaths: ['/health', '/admin'],
    },
  },

  // GDPR compliance middleware
  {
    name: 'global::gdpr-compliance',
    config: {
      enabled: true,
      cookieConsent: true,
      dataRetention: true,
      auditLogging: true,
      anonymization: true,
    },
  },

  // Error tracking middleware (Sentry integration)
  {
    name: 'global::error-tracking',
    config: {
      enabled: process.env.SENTRY_DSN ? true : false,
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.APP_VERSION || '1.0.0',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    },
  },
];