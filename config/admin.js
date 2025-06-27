/**
 * Admin Panel Configuration
 * GoAIX Platform - Admin panel settings for quiz.goaiex.com
 */

module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET', 'generateRandomAdminJWTSecret'),
    options: {
      expiresIn: env('ADMIN_JWT_EXPIRES_IN', '30d'),
      issuer: 'quiz.goaiex.com',
      audience: 'admin.quiz.goaiex.com',
    },
  },
  
  apiToken: {
    salt: env('API_TOKEN_SALT', 'generateRandomAPITokenSalt'),
  },
  
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT', 'generateRandomTransferTokenSalt'),
    },
  },

  // Admin panel URL configuration
  url: env('ADMIN_URL', '/admin'),
  
  // Serve admin panel (set to false if using separate admin deployment)
  serveAdminPanel: env.bool('SERVE_ADMIN_PANEL', true),

  // Auto-open admin panel in development
  autoOpen: env.bool('ADMIN_AUTO_OPEN', env('NODE_ENV') === 'development'),

  // Admin panel host and port (for separate deployment)
  host: env('ADMIN_HOST', 'localhost'),
  port: env.int('ADMIN_PORT', 8000),

  // Branding configuration
  branding: {
    // Logo URLs
    logo: env('ADMIN_LOGO_URL', '/uploads/goaix_logo.png'),
    favicon: env('ADMIN_FAVICON_URL', '/uploads/goaix_favicon.ico'),
    
    // Custom colors (hex values)
    primaryColor: env('ADMIN_PRIMARY_COLOR', '#4F46E5'), // Indigo
    secondaryColor: env('ADMIN_SECONDARY_COLOR', '#F59E0B'), // Amber
    
    // Custom title
    title: env('ADMIN_TITLE', 'GoAIX Admin - Quiz Platform'),
  },

  // Localization
  locales: [
    'en',
    'de', // German for German market
  ],

  // Theme configuration
  theme: {
    light: {
      colors: {
        primary100: '#f0f9ff',
        primary200: '#e0f2fe', 
        primary500: '#0ea5e9',
        primary600: '#0284c7',
        primary700: '#0369a1',
        danger700: '#dc2626',
      },
    },
    dark: {
      colors: {
        primary100: '#1e1b4b',
        primary200: '#312e81',
        primary500: '#6366f1', 
        primary600: '#4f46e5',
        primary700: '#4338ca',
        danger700: '#ef4444',
      },
    },
  },

  // Forgot password configuration
  forgotPassword: {
    enabled: env.bool('ADMIN_FORGOT_PASSWORD_ENABLED', true),
    from: env('EMAIL_FROM_ADDRESS', 'noreply@quiz.goaiex.com'),
    replyTo: env('EMAIL_REPLY_TO', 'admin@quiz.goaiex.com'),
    subject: env('ADMIN_FORGOT_PASSWORD_SUBJECT', 'GoAIX - Password Reset'),
  },

  // Session configuration
  session: {
    secret: env('SESSION_SECRET', 'generateRandomSessionSecret'),
    cookie: {
      secure: env.bool('SESSION_SECURE', env('NODE_ENV') === 'production'),
      maxAge: env.int('SESSION_MAX_AGE', 1000 * 60 * 60 * 24 * 30), // 30 days
      httpOnly: true,
      sameSite: env('SESSION_SAME_SITE', 'lax'),
      domain: env('SESSION_DOMAIN', null), // Let Railway handle domain automatically
    },
  },

  // CORS for admin panel
  cors: {
    enabled: true,
    origin: [
      'https://admin.quiz.goaiex.com',
      'https://quiz.goaiex.com',
      'http://localhost:3000',
      'http://localhost:8000',
    ],
    credentials: true,
  },

  // Rate limiting for admin endpoints
  rateLimit: {
    enabled: env.bool('ADMIN_RATE_LIMIT_ENABLED', true),
    interval: env.int('ADMIN_RATE_LIMIT_INTERVAL', 60000), // 1 minute
    max: env.int('ADMIN_RATE_LIMIT_MAX', 200), // Higher limit for admin users
  },

  // Security configuration
  security: {
    // Content Security Policy for admin panel
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
          'https://res.cloudinary.com'
        ],
        'media-src': ["'self'", 'data:', 'blob:'],
        'frame-src': ["'self'"],
        upgradeInsecureRequests: env('NODE_ENV') === 'production' ? [] : null,
      },
    },
    
    // Helmet security headers
    helmet: {
      contentSecurityPolicy: env.bool('ADMIN_CSP_ENABLED', true),
      crossOriginEmbedderPolicy: false,
      frameguard: {
        action: 'deny',
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    },
  },

  // File upload configuration for admin
  upload: {
    config: {
      provider: 'local',
      sizeLimit: env.int('ADMIN_UPLOAD_SIZE_LIMIT', 256 * 1024 * 1024), // 256MB
      formats: ['images', 'videos', 'files'],
    },
  },

  // Audit logs configuration
  auditLogs: {
    enabled: env.bool('ADMIN_AUDIT_LOGS_ENABLED', true),
    retentionDays: env.int('ADMIN_AUDIT_RETENTION_DAYS', 90),
    events: [
      'entry.create',
      'entry.update', 
      'entry.delete',
      'user.create',
      'user.update',
      'user.delete',
      'admin.auth',
    ],
  },

  // Monitoring and analytics
  monitoring: {
    enabled: env.bool('ADMIN_MONITORING_ENABLED', env('NODE_ENV') === 'production'),
    provider: env('MONITORING_PROVIDER', 'custom'), // custom, datadog, newrelic
    endpoint: env('MONITORING_ENDPOINT'),
    apiKey: env('MONITORING_API_KEY'),
  },

  // Custom admin middleware
  middleware: {
    // Request timeout for admin operations
    timeout: env.int('ADMIN_REQUEST_TIMEOUT', 60000), // 1 minute

    // Body size limits for admin uploads
    bodyLimit: env('ADMIN_BODY_LIMIT', '100mb'),
    
    // Enable compression for admin panel
    compression: env.bool('ADMIN_COMPRESSION_ENABLED', true),
  },

  // Feature flags for admin panel
  features: {
    // Enable/disable content manager features
    contentManager: {
      bulkActions: env.bool('ADMIN_BULK_ACTIONS_ENABLED', true),
      clone: env.bool('ADMIN_CLONE_ENABLED', true),
      export: env.bool('ADMIN_EXPORT_ENABLED', true),
      import: env.bool('ADMIN_IMPORT_ENABLED', true),
    },
    
    // Enable/disable media library features
    mediaLibrary: {
      upload: env.bool('ADMIN_MEDIA_UPLOAD_ENABLED', true),
      folders: env.bool('ADMIN_MEDIA_FOLDERS_ENABLED', true),
      crop: env.bool('ADMIN_MEDIA_CROP_ENABLED', true),
    },
    
    // Enable/disable user management features
    userManagement: {
      create: env.bool('ADMIN_USER_CREATE_ENABLED', true),
      invite: env.bool('ADMIN_USER_INVITE_ENABLED', true),
      roles: env.bool('ADMIN_USER_ROLES_ENABLED', true),
    },
  },

  // Tutorial and onboarding
  tutorial: {
    enabled: env.bool('ADMIN_TUTORIAL_ENABLED', true),
    skipForSuperAdmin: env.bool('ADMIN_TUTORIAL_SKIP_SUPER_ADMIN', true),
  },

  // Telemetry configuration
  telemetry: {
    enabled: env.bool('ADMIN_TELEMETRY_ENABLED', false),
    optOut: env.bool('STRAPI_TELEMETRY_DISABLED', true),
  },
});