/**
 * Middlewares Configuration
 * GoAIX Platform - Simplified for initial deployment
 */

module.exports = [
  // Error handling middleware (first in stack)
  'strapi::errors',
  
  // Security middleware
  'strapi::security',

  // CORS middleware - simplified for debugging
  'strapi::cors',

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