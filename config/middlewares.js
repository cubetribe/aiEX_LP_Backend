/**
 * Middlewares Configuration
 * GoAIX Platform - Simplified for initial deployment
 */

module.exports = [
  // Error handling middleware (first in stack)
  'strapi::errors',
  
  // Security middleware
  'strapi::security',

  // CORS middleware - configured for Vercel frontend
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      headers: '*',
      origin: function(ctx) {
        const origin = ctx.get('Origin');
        if (origin && (origin.endsWith('.vercel.app') || origin.includes('goaiex.com'))) {
          return origin;
        }
        return false;
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