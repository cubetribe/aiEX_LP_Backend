/**
 * Server Configuration
 * GoAIX Platform - quiz.goaiex.com deployment configuration
 */

module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  
  // Production URL configuration for quiz.goaiex.com
  url: env('STRAPI_URL', 
    env('NODE_ENV') === 'production' 
      ? 'https://api.quiz.goaiex.com' 
      : 'http://localhost:1337'
  ),

  // Enable proxy for production deployments
  proxy: env.bool('STRAPI_PROXY', env('NODE_ENV') === 'production'),

  // App configuration
  app: {
    keys: env.array('APP_KEYS', [
      'defaultKey1',
      'defaultKey2', 
      'defaultKey3',
      'defaultKey4'
    ]),
  },

  // Webhooks configuration
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
    defaultHeaders: {
      'User-Agent': 'GoAIX/1.0 (quiz.goaiex.com)',
    },
  },

  // Security headers for production
  security: {
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'connect-src': ["'self'", 'https:', 'https://quiz.goaiex.com'],
        'img-src': [
          "'self'", 
          'data:', 
          'blob:', 
          'https:', 
          'https://quiz.goaiex.com',
          'https://res.cloudinary.com' // For image hosting
        ],
        'media-src': ["'self'", 'data:', 'blob:', 'https://quiz.goaiex.com'],
        'frame-src': ["'self'", 'https://quiz.goaiex.com'],
        upgradeInsecureRequests: env('NODE_ENV') === 'production' ? [] : null,
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  },

  // CORS configuration for quiz.goaiex.com
  cors: {
    enabled: true,
    headers: '*',
    origin: [
      'http://localhost:3000',          // Development
      'http://localhost:3001',          // Alternative dev port
      'https://quiz.goaiex.com',        // Production frontend
      'https://www.quiz.goaiex.com',    // Production frontend with www
      'https://api.quiz.goaiex.com',    // API domain
      'https://admin.quiz.goaiex.com',  // Admin panel
      'https://aiex-quiz-platform.vercel.app', // Production Vercel domain
      'https://aiex-quiz-platform-p95rbzznb-cubetribes-projects.vercel.app', // Current deployment
      ...(env('ADDITIONAL_CORS_ORIGINS', '').split(',').filter(Boolean))
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Frame-Options',
      'Access-Control-Allow-Origin',
      'X-Requested-With'
    ],
  },

  // Rate limiting configuration
  rateLimit: {
    enabled: env.bool('RATE_LIMIT_ENABLED', true),
    interval: env.int('RATE_LIMIT_INTERVAL', 60000), // 1 minute
    max: env.int('RATE_LIMIT_MAX', 100), // 100 requests per minute
    delayAfter: env.int('RATE_LIMIT_DELAY_AFTER', 50),
    delayMs: env.int('RATE_LIMIT_DELAY_MS', 500),
    skipSuccessfulRequests: true,
    skipFailedRequests: false,
    keyGenerator: (request) => {
      return request.ip || request.connection.remoteAddress;
    },
    message: {
      error: 'Too many requests, please try again later.',
      statusCode: 429,
    },
  },

  // SSL configuration for production
  ssl: env('NODE_ENV') === 'production' && env.bool('SSL_ENABLED', true) ? {
    key: env('SSL_KEY_PATH'),
    cert: env('SSL_CERT_PATH'),
  } : undefined,

  // Logging configuration
  logger: {
    level: env('LOG_LEVEL', 'info'),
    prettyPrint: env('NODE_ENV') !== 'production',
    timestamp: env.bool('LOG_TIMESTAMP', true),
    forceColor: env.bool('LOG_FORCE_COLOR', false),
  },

  // Admin panel configuration
  admin: {
    auth: {
      secret: env('ADMIN_JWT_SECRET', 'defaultAdminSecret'),
    },
    url: env('ADMIN_URL', '/admin'),
    serveAdminPanel: env.bool('SERVE_ADMIN_PANEL', true),
    forgotPassword: {
      from: env('EMAIL_FROM_ADDRESS', 'noreply@quiz.goaiex.com'),
      replyTo: env('EMAIL_REPLY_TO', 'support@quiz.goaiex.com'),
    },
    transfer: {
      token: {
        salt: env('TRANSFER_TOKEN_SALT', 'defaultTransferTokenSalt'),
      },
    },
  },

  // API configuration
  api: {
    rest: {
      defaultLimit: env.int('API_DEFAULT_LIMIT', 25),
      maxLimit: env.int('API_MAX_LIMIT', 100),
      withCount: env.bool('API_WITH_COUNT', true),
    },
  },

  // Performance optimizations
  performance: {
    compression: env.bool('COMPRESSION_ENABLED', true),
    etag: env.bool('ETAG_ENABLED', true),
    responseTime: env.bool('RESPONSE_TIME_ENABLED', true),
  },

  // Health check endpoint
  healthCheck: {
    enabled: env.bool('HEALTH_CHECK_ENABLED', true),
    endpoint: env('HEALTH_CHECK_ENDPOINT', '/health'),
  },

  // Custom middleware configuration
  middleware: {
    timeout: env.int('REQUEST_TIMEOUT', 30000), // 30 seconds
    bodyLimit: env('BODY_LIMIT', '50mb'),
    jsonLimit: env('JSON_LIMIT', '50mb'),
  },
});