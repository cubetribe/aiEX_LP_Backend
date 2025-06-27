'use strict';

/**
 * AI Model and Provider Validation Utilities
 */

const AI_MODEL_PROVIDERS = {
  // ChatGPT Models (OpenAI)
  'gpt-4.5': 'chatgpt',
  'gpt-4.1': 'chatgpt', 
  'gpt-4o': 'chatgpt',
  'gpt-4o-mini': 'chatgpt',
  'gpt-4-turbo': 'chatgpt',
  'gpt-3.5-turbo': 'chatgpt',
  
  // Anthropic Claude Models
  'claude-opus-3.7': 'anthropic',
  'claude-sonnet-3.7': 'anthropic',
  
  // Google Gemini Models
  'gemini-2.5-pro': 'gemini',
  'gemini-2.5-flash': 'gemini'
};

const MODEL_CAPABILITIES = {
  // ChatGPT Models (OpenAI)
  'gpt-4.5': { 
    maxTokens: 200000, 
    inputCost: 5.00, 
    outputCost: 20.00,
    description: 'ChatGPT – bestes Modell für komplexe Aufgaben & Kreativität'
  },
  'gpt-4.1': { 
    maxTokens: 128000, 
    inputCost: 3.50, 
    outputCost: 14.00,
    description: 'ChatGPT – stark bei Coding & Business-Analyse'
  },
  'gpt-4o': { 
    maxTokens: 128000, 
    inputCost: 2.50, 
    outputCost: 10.00,
    description: 'ChatGPT – schnell, günstig, multimodal (Text, Bild, Audio)'
  },
  'gpt-4o-mini': { 
    maxTokens: 128000, 
    inputCost: 0.15, 
    outputCost: 0.60,
    description: 'ChatGPT – günstige Variante für Standard-Chats'
  },
  'gpt-4-turbo': { 
    maxTokens: 128000, 
    inputCost: 3.00, 
    outputCost: 12.00,
    description: 'ChatGPT – performanceorientiert mit großem Kontext'
  },
  'gpt-3.5-turbo': { 
    maxTokens: 16000, 
    inputCost: 0.50, 
    outputCost: 1.50,
    description: 'ChatGPT – geeignet für einfache Aufgaben & Supportbots'
  },
  
  // Anthropic Claude Models
  'claude-opus-3.7': { 
    maxTokens: 200000, 
    inputCost: 15.00, 
    outputCost: 75.00,
    description: 'Anthropic – tiefes Reasoning & Textverständnis'
  },
  'claude-sonnet-3.7': { 
    maxTokens: 200000, 
    inputCost: 3.00, 
    outputCost: 15.00,
    description: 'Anthropic – schnell, stark bei präziser Sprache'
  },
  
  // Google Gemini Models
  'gemini-2.5-pro': { 
    maxTokens: 2000000, 
    inputCost: 1.25, 
    outputCost: 5.00,
    description: 'Gemini – top bei multimodalem Input & Webverknüpfung'
  },
  'gemini-2.5-flash': { 
    maxTokens: 1000000, 
    inputCost: 0.075, 
    outputCost: 0.30,
    description: 'Gemini – sehr schnell & leichtgewichtig, ideal für UI-Feedback'
  }
};

/**
 * Get the provider for a given AI model
 */
function getProviderForModel(model) {
  return AI_MODEL_PROVIDERS[model] || 'unknown';
}

/**
 * Validate if model matches provider
 */
function validateModelProvider(model, provider) {
  if (provider === 'auto') return true;
  
  const expectedProvider = getProviderForModel(model);
  return expectedProvider === provider;
}

/**
 * Get all models for a specific provider
 */
function getModelsForProvider(provider) {
  return Object.keys(AI_MODEL_PROVIDERS).filter(
    model => AI_MODEL_PROVIDERS[model] === provider
  );
}

/**
 * Get model capabilities and pricing
 */
function getModelInfo(model) {
  return MODEL_CAPABILITIES[model] || null;
}

/**
 * Get recommended model for campaign type
 */
function getRecommendedModel(campaignType, budget = 'medium') {
  const recommendations = {
    quiz: {
      low: 'gpt-4o-mini',
      medium: 'claude-3.5-sonnet', 
      high: 'gpt-4o'
    },
    chatbot: {
      low: 'claude-3-haiku',
      medium: 'claude-3.5-sonnet',
      high: 'claude-3-opus'
    },
    analysis: {
      low: 'gemini-1.5-flash',
      medium: 'gemini-1.5-pro',
      high: 'o1-preview'
    }
  };
  
  return recommendations[campaignType]?.[budget] || 'gpt-4o-mini';
}

module.exports = {
  AI_MODEL_PROVIDERS,
  MODEL_CAPABILITIES,
  getProviderForModel,
  validateModelProvider,
  getModelsForProvider,
  getModelInfo,
  getRecommendedModel
};