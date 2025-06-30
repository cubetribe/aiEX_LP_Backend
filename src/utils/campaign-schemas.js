/**
 * Campaign Configuration Schema Validation
 * Using Zod for runtime type checking and validation
 */

const { z } = require('zod');

// Base question schema for all campaign types
const QuestionSchema = z.object({
  id: z.string().min(1, 'Question ID is required'),
  question: z.string().min(1, 'Question text is required'),
  type: z.enum(['single-choice', 'multiple-choice', 'text', 'rating', 'slider', 'date', 'email']),
  required: z.boolean().default(false),
  options: z.array(z.union([
    z.string(),
    z.object({
      value: z.string(),
      label: z.string(),
      score: z.number().optional()
    })
  ])).optional(),
  conditional: z.object({
    showIf: z.object({
      field: z.string(),
      operator: z.enum(['equals', 'not_equals', 'in', 'not_in', 'greater_than', 'less_than']),
      value: z.union([z.string(), z.number(), z.array(z.string())])
    })
  }).optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    message: z.string().optional()
  }).optional()
});

// Scoring configuration schema
const ScoringSchema = z.object({
  logic: z.enum(['weighted', 'conditional', 'simple']).default('weighted'),
  weights: z.record(z.number()).default({}),
  rules: z.array(z.object({
    if: z.record(z.union([z.string(), z.number(), z.array(z.string())])),
    then: z.object({
      leadScore: z.number().min(0).max(100),
      leadQuality: z.enum(['hot', 'warm', 'cold', 'unqualified'])
    })
  })).default([]),
  default: z.object({
    leadScore: z.number().min(0).max(100).default(50),
    leadQuality: z.enum(['hot', 'warm', 'cold', 'unqualified']).default('warm')
  }).default({ leadScore: 50, leadQuality: 'warm' })
});

// Styling configuration schema
const StylingSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').default('#007bff'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').default('#6c757d'),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  fontFamily: z.string().optional(),
  fontSize: z.string().optional(),
  borderRadius: z.string().optional(),
  customCSS: z.string().optional()
});

// Behavior configuration schema
const BehaviorSchema = z.object({
  showProgress: z.boolean().default(true),
  allowBack: z.boolean().default(true),
  randomizeQuestions: z.boolean().default(false),
  conditionalLogic: z.boolean().default(false),
  autoAdvance: z.boolean().default(false),
  timeLimit: z.number().positive().optional(),
  requireAllQuestions: z.boolean().default(false)
});

// Quiz Campaign Schema
const QuizConfigSchema = z.object({
  type: z.literal('quiz'),
  title: z.string().min(1, 'Quiz title is required'),
  description: z.string().optional(),
  questions: z.array(QuestionSchema).min(0).default([]), // Allow empty questions array for draft campaigns
  scoring: ScoringSchema.default({}),
  styling: StylingSchema.default({}),
  behavior: BehaviorSchema.default({})
});

// Text Campaign Schema
const TextConfigSchema = z.object({
  type: z.literal('text'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  callToAction: z.string().optional(),
  styling: StylingSchema.default({}),
  behavior: BehaviorSchema.default({})
});

// Image Upload Campaign Schema
const ImageConfigSchema = z.object({
  type: z.literal('image'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  allowedFormats: z.array(z.string()).default(['jpg', 'jpeg', 'png', 'gif']),
  maxFileSize: z.number().positive().default(5242880), // 5MB
  maxFiles: z.number().positive().default(1),
  styling: StylingSchema.default({}),
  behavior: BehaviorSchema.default({})
});

// Chatbot Campaign Schema
const ChatbotConfigSchema = z.object({
  type: z.literal('chatbot'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  initialMessage: z.string().min(1, 'Initial message is required'),
  conversationFlow: z.object({
    maxMessages: z.number().positive().default(10),
    collectEmail: z.boolean().default(true),
    aiProvider: z.enum(['openai', 'anthropic', 'gemini', 'auto']).default('auto'),
    personality: z.string().optional()
  }).default({}),
  styling: StylingSchema.default({}),
  behavior: BehaviorSchema.default({})
});

// Custom Campaign Schema (flexible)
const CustomConfigSchema = z.object({
  type: z.literal('custom'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  customFields: z.record(z.any()).default({}),
  styling: StylingSchema.default({}),
  behavior: BehaviorSchema.default({})
});

// Main config schema that discriminates by type
const CampaignConfigSchema = z.discriminatedUnion('type', [
  QuizConfigSchema,
  TextConfigSchema,
  ImageConfigSchema,
  ChatbotConfigSchema,
  CustomConfigSchema
]);

// Result display configuration schema
const ResultDisplayConfigSchema = z.object({
  showOnScreen: z.boolean().default(true),
  sendEmail: z.boolean().default(false),
  emailRequired: z.boolean().default(false),
  resultPageTitle: z.string().default('Ihr personalisiertes Ergebnis'),
  resultPageSubtitle: z.string().default('Basierend auf Ihren Antworten haben wir folgende Empfehlungen:'),
  showDownloadButton: z.boolean().default(true),
  showShareButton: z.boolean().default(true),
  redirectAfterResult: z.string().url().optional(),
  autoRedirectDelay: z.number().min(0).default(0)
});

/**
 * Validate campaign configuration
 * @param {Object} config - Campaign configuration object
 * @param {string} campaignType - Type of campaign
 * @param {boolean} isPartialUpdate - Whether this is a partial update (e.g., from admin panel)
 * @returns {Object} Validation result
 */
function validateCampaignConfig(config, campaignType, isPartialUpdate = false) {
  try {
    // For partial updates, check if we're only updating nested properties
    if (isPartialUpdate && config) {
      const topLevelKeys = Object.keys(config);
      const nestedOnlyKeys = ['styling', 'behavior', 'scoring', 'metadata'];
      const coreKeys = ['type', 'title', 'questions', 'content'];
      
      const hasOnlyNestedKeys = topLevelKeys.every(key => nestedOnlyKeys.includes(key));
      const hasCoreKeys = topLevelKeys.some(key => coreKeys.includes(key));
      
      // If only updating nested properties and no core keys, skip full validation
      if (hasOnlyNestedKeys && !hasCoreKeys) {
        console.log('Partial update with only nested keys, applying lenient validation');
        return {
          success: true,
          data: config,
          errors: [],
          isPartialUpdate: true
        };
      }
    }
    
    // Ensure config has correct type
    const configWithType = { ...config, type: campaignType };
    
    // For configs missing title but having other valid structure, add a default title
    // This handles legacy campaigns or those created without proper validation
    if (campaignType === 'quiz' && !configWithType.title && configWithType.questions) {
      console.log('Adding default title to legacy quiz config');
      configWithType.title = 'Quiz Campaign'; // Default title
    }
    
    // Parse and validate
    const validatedConfig = CampaignConfigSchema.parse(configWithType);
    
    return {
      success: true,
      data: validatedConfig,
      errors: []
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      };
    }
    
    return {
      success: false,
      data: null,
      errors: [{ path: 'unknown', message: error.message, code: 'unknown' }]
    };
  }
}

/**
 * Validate result display configuration
 * @param {Object} config - Result display configuration
 * @returns {Object} Validation result
 */
function validateResultDisplayConfig(config) {
  try {
    const validatedConfig = ResultDisplayConfigSchema.parse(config);
    return {
      success: true,
      data: validatedConfig,
      errors: []
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      };
    }
    
    return {
      success: false,
      data: null,
      errors: [{ path: 'unknown', message: error.message, code: 'unknown' }]
    };
  }
}

module.exports = {
  CampaignConfigSchema,
  ResultDisplayConfigSchema,
  validateCampaignConfig,
  validateResultDisplayConfig,
  QuestionSchema,
  ScoringSchema,
  StylingSchema,
  BehaviorSchema
};