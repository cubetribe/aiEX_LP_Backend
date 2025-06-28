/**
 * Middlewares Configuration
 * GoAIX Platform - Simplified for initial deployment
 */

module.exports = [
  // Error handling middleware (first in stack)
  'strapi::errors',
  
  // Security middleware with relaxed CSP for admin tools
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:', 'http:'],
          'img-src': ["'self'", 'data:', 'blob:', 'https:'],
          'media-src': ["'self'", 'data:', 'blob:'],
          'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          'script-src-attr': ["'self'", "'unsafe-inline'"],
          upgradeInsecureRequests: null,
        },
      },
    },
  },

  // CORS middleware - configured for Vercel frontend
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      headers: '*',
      origin: function(ctx) {
        const origin = ctx.get('Origin');
        // Allow localhost for development
        if (origin && (origin.includes('localhost') || origin.endsWith('.vercel.app') || origin.includes('goaiex.com'))) {
          return origin;
        }
        // For debugging: allow any origin temporarily
        return origin || '*';
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      maxAge: 86400, // 24 hours
    },
  },

  // Remove or customize powered-by header
  'strapi::poweredBy',

  // Request logging middleware
  'strapi::logger',

  // Query parsing middleware
  'strapi::query',

  // Request body parsing
  'strapi::body',

  // Session middleware
  'strapi::session',

  // Favicon middleware
  'strapi::favicon',

  // Static file serving
  'strapi::public',
];