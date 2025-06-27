/**
 * Middlewares Configuration
 * GoAIX Platform - Simplified for initial deployment
 */

module.exports = [
  // Error handling middleware (first in stack)
  'strapi::errors',
  
  // Security middleware
  'strapi::security',

  // CORS middleware
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      headers: '*',
      origin: [
        'http://localhost:3000',           // Development
        'http://localhost:3001',           // Alternative dev port
        'https://quiz.goaiex.com',         // Production frontend
        'https://www.quiz.goaiex.com',     // Production frontend with www
        'https://api.quiz.goaiex.com',     // API domain
        'https://admin.quiz.goaiex.com',   // Admin panel
        'https://aiex-quiz-platform-74aqwr4a9-cubetribes-projects.vercel.app', // Vercel deployment
        'https://aiex-quiz-platform.vercel.app', // Vercel custom domain
        'https://*.vercel.app',            // All Vercel subdomains
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
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