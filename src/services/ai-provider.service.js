'use strict';

/**
 * AI Provider Service
 * Real AI integration for prompt testing and result generation
 */

const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIProviderService {
  constructor() {
    this.providers = {};
    this.isConfigured = {};
    this.init();
  }

  async init() {
    try {
      // Initialize OpenAI
      if (process.env.OPENAI_API_KEY) {
        this.providers.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        this.isConfigured.openai = true;
        strapi.log.info('OpenAI provider initialized');
      }

      // Initialize Anthropic Claude
      if (process.env.ANTHROPIC_API_KEY) {
        this.providers.anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });
        this.isConfigured.anthropic = true;
        strapi.log.info('Anthropic provider initialized');
      }

      // Initialize Google Gemini
      if (process.env.GOOGLE_API_KEY) {
        this.providers.gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        this.isConfigured.gemini = true;
        strapi.log.info('Google Gemini provider initialized');
      }

      strapi.log.info(`AI Provider Service initialized with ${Object.keys(this.isConfigured).length} providers`);
    } catch (error) {
      strapi.log.error('AI Provider Service initialization failed:', error);
    }
  }

  /**
   * Test a prompt with different providers
   */
  async testPrompt(promptTemplate, sampleData, options = {}) {
    const results = {};
    const providers = options.providers || ['openai', 'anthropic', 'gemini'];
    const model = options.model || 'auto';

    // Process template with sample data
    const processedPrompt = this.processPromptTemplate(promptTemplate, sampleData);

    for (const provider of providers) {
      if (!this.isConfigured[provider]) {
        results[provider] = {
          success: false,
          error: `Provider ${provider} not configured`,
          cost: 0
        };
        continue;
      }

      try {
        const startTime = Date.now();
        
        let response;
        let cost = 0;
        let modelUsed = model;

        switch (provider) {
          case 'openai':
            const openaiResult = await this.callOpenAI(processedPrompt, model);
            response = openaiResult.response;
            cost = openaiResult.cost;
            modelUsed = openaiResult.model;
            break;
            
          case 'anthropic':
            const anthropicResult = await this.callAnthropic(processedPrompt, model);
            response = anthropicResult.response;
            cost = anthropicResult.cost;
            modelUsed = anthropicResult.model;
            break;
            
          case 'gemini':
            const geminiResult = await this.callGemini(processedPrompt, model);
            response = geminiResult.response;
            cost = geminiResult.cost;
            modelUsed = geminiResult.model;
            break;
        }

        const duration = Date.now() - startTime;

        results[provider] = {
          success: true,
          response,
          model: modelUsed,
          duration,
          cost,
          timestamp: new Date().toISOString(),
          metrics: this.calculateResponseMetrics(response)
        };

      } catch (error) {
        results[provider] = {
          success: false,
          error: error.message,
          duration: Date.now() - startTime,
          cost: 0
        };
      }
    }

    return {
      prompt: processedPrompt,
      sampleData,
      results,
      totalCost: Object.values(results).reduce((sum, r) => sum + (r.cost || 0), 0),
      comparison: this.compareResponses(results)
    };
  }

  /**
   * Call OpenAI API
   */
  async callOpenAI(prompt, model = 'auto') {
    if (!this.isConfigured.openai) {
      throw new Error('OpenAI not configured');
    }

    // Auto-select model if not specified
    if (model === 'auto') {
      model = 'gpt-4o'; // Default to GPT-4o for good balance of quality/cost
    }

    const completion = await this.providers.openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "Du bist ein Experte für personalisierte AI-Empfehlungen. Erstelle präzise, hilfreiche und professionelle Antworten basierend auf den Benutzerdaten."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });

    const response = completion.choices[0].message.content;
    
    // Calculate cost (approximate pricing)
    const inputTokens = completion.usage.prompt_tokens;
    const outputTokens = completion.usage.completion_tokens;
    const cost = this.calculateOpenAICost(model, inputTokens, outputTokens);

    return { response, cost, model };
  }

  /**
   * Call Anthropic Claude API
   */
  async callAnthropic(prompt, model = 'auto') {
    if (!this.isConfigured.anthropic) {
      throw new Error('Anthropic not configured');
    }

    // Auto-select model if not specified
    if (model === 'auto') {
      model = 'claude-3-5-sonnet-20241022'; // Default to Sonnet for good balance
    }

    const message = await this.providers.anthropic.messages.create({
      model,
      max_tokens: 1000,
      temperature: 0.7,
      system: "Du bist ein Experte für personalisierte AI-Empfehlungen. Erstelle präzise, hilfreiche und professionelle Antworten basierend auf den Benutzerdaten.",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const response = message.content[0].text;
    
    // Calculate cost (approximate pricing)
    const inputTokens = message.usage.input_tokens;
    const outputTokens = message.usage.output_tokens;
    const cost = this.calculateAnthropicCost(model, inputTokens, outputTokens);

    return { response, cost, model };
  }

  /**
   * Call Google Gemini API
   */
  async callGemini(prompt, model = 'auto') {
    if (!this.isConfigured.gemini) {
      throw new Error('Gemini not configured');
    }

    // Auto-select model if not specified
    if (model === 'auto') {
      model = 'gemini-1.5-flash'; // Default to Flash for speed/cost
    }

    const genModel = this.providers.gemini.getGenerativeModel({ model });
    
    const enhancedPrompt = `Du bist ein Experte für personalisierte AI-Empfehlungen. Erstelle präzise, hilfreiche und professionelle Antworten basierend auf den Benutzerdaten.

${prompt}`;

    const result = await genModel.generateContent(enhancedPrompt);
    const response = result.response.text();
    
    // Calculate cost (approximate - Gemini pricing is complex)
    const cost = this.calculateGeminiCost(model, prompt.length, response.length);

    return { response, cost, model };
  }

  /**
   * Process prompt template with variables
   */
  processPromptTemplate(template, data) {
    let processed = template;
    
    // Standard template variables
    const variables = {
      firstName: data.firstName || '[Name nicht verfügbar]',
      email: data.email || '[E-Mail nicht verfügbar]',
      responses: JSON.stringify(data.responses || {}, null, 2),
      campaignTitle: data.campaignTitle || '[Kampagne]',
      leadScore: data.leadScore || 0,
      leadQuality: data.leadQuality || 'unqualified',
      responseCount: Object.keys(data.responses || {}).length,
      timestamp: new Date().toLocaleString('de-DE')
    };

    // Replace template variables
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      processed = processed.replace(regex, value);
    });

    return processed;
  }

  /**
   * Calculate response quality metrics
   */
  calculateResponseMetrics(response) {
    if (!response) return null;

    return {
      length: response.length,
      wordCount: response.split(/\s+/).length,
      sentenceCount: response.split(/[.!?]+/).length - 1,
      paragraphCount: response.split(/\n\s*\n/).length,
      hasEmojis: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(response),
      hasStructure: /•|1\.|2\.|3\.|\n\n/.test(response),
      professionalTone: !response.toLowerCase().includes('hey') && !response.toLowerCase().includes('cool'),
      includesNextSteps: response.toLowerCase().includes('schritt') || response.toLowerCase().includes('empfehlung'),
      readabilityScore: this.calculateReadabilityScore(response)
    };
  }

  /**
   * Simple readability score calculation
   */
  calculateReadabilityScore(text) {
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length - 1;
    const avgWordsPerSentence = words / Math.max(sentences, 1);
    
    // Simple scoring: prefer 10-20 words per sentence
    if (avgWordsPerSentence >= 10 && avgWordsPerSentence <= 20) {
      return 'optimal';
    } else if (avgWordsPerSentence >= 5 && avgWordsPerSentence <= 30) {
      return 'good';
    } else {
      return 'needs_improvement';
    }
  }

  /**
   * Compare responses between providers
   */
  compareResponses(results) {
    const successful = Object.entries(results).filter(([_, result]) => result.success);
    
    if (successful.length === 0) {
      return { recommendation: 'No successful responses' };
    }

    // Find best response based on multiple criteria
    let bestProvider = null;
    let bestScore = -1;

    successful.forEach(([provider, result]) => {
      const metrics = result.metrics;
      if (!metrics) return;

      // Calculate composite score
      let score = 0;
      
      // Word count (prefer 100-300 words)
      if (metrics.wordCount >= 100 && metrics.wordCount <= 300) score += 20;
      else if (metrics.wordCount >= 50) score += 10;
      
      // Structure (prefer structured responses)
      if (metrics.hasStructure) score += 15;
      
      // Professional tone
      if (metrics.professionalTone) score += 15;
      
      // Next steps included
      if (metrics.includesNextSteps) score += 15;
      
      // Readability
      if (metrics.readabilityScore === 'optimal') score += 15;
      else if (metrics.readabilityScore === 'good') score += 10;
      
      // Speed bonus (prefer under 3 seconds)
      if (result.duration < 3000) score += 10;
      
      // Cost efficiency (prefer lower cost for similar quality)
      if (result.cost < 0.01) score += 10;
      else if (result.cost < 0.05) score += 5;

      if (score > bestScore) {
        bestScore = score;
        bestProvider = provider;
      }
    });

    return {
      recommendation: bestProvider,
      bestScore,
      analysis: successful.map(([provider, result]) => ({
        provider,
        cost: result.cost,
        duration: result.duration,
        quality: result.metrics,
        response: result.response.substring(0, 150) + '...'
      }))
    };
  }

  /**
   * Calculate OpenAI costs (approximate)
   */
  calculateOpenAICost(model, inputTokens, outputTokens) {
    const pricing = {
      'gpt-4o': { input: 0.0025, output: 0.01 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4-turbo': { input: 0.003, output: 0.012 },
      'gpt-4': { input: 0.003, output: 0.006 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
    };

    const rates = pricing[model] || pricing['gpt-4o'];
    return (inputTokens / 1000 * rates.input) + (outputTokens / 1000 * rates.output);
  }

  /**
   * Calculate Anthropic costs (approximate)
   */
  calculateAnthropicCost(model, inputTokens, outputTokens) {
    const pricing = {
      'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
      'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
      'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 }
    };

    const rates = pricing[model] || pricing['claude-3-5-sonnet-20241022'];
    return (inputTokens / 1000 * rates.input) + (outputTokens / 1000 * rates.output);
  }

  /**
   * Calculate Gemini costs (approximate)
   */
  calculateGeminiCost(model, inputLength, outputLength) {
    // Simplified cost calculation for Gemini
    const approxInputTokens = inputLength / 4;
    const approxOutputTokens = outputLength / 4;
    
    const pricing = {
      'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
      'gemini-1.5-flash': { input: 0.000075, output: 0.0003 }
    };

    const rates = pricing[model] || pricing['gemini-1.5-flash'];
    return (approxInputTokens / 1000 * rates.input) + (approxOutputTokens / 1000 * rates.output);
  }

  /**
   * Get provider status
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      available: Object.keys(this.isConfigured).filter(p => this.isConfigured[p])
    };
  }

  /**
   * Get sample data for prompt testing (production-safe defaults)
   */
  getSampleData() {
    return [
      {
        name: 'Standard Profile',
        data: {
          firstName: '{{firstName}}',
          email: '{{email}}',
          campaignTitle: '{{campaignTitle}}',
          leadScore: 70,
          leadQuality: 'warm',
          responses: {
            answer_1: 'Sample response 1',
            answer_2: 'Sample response 2'
          }
        }
      }
    ];
  }

  /**
   * Generate content using the specified AI provider
   * This is the main method for production use
   */
  async generateContent(promptTemplate, data, options = {}) {
    try {
      // Process the prompt template with data
      const processedPrompt = this.processPromptTemplate(promptTemplate, data);
      
      // Determine which provider to use
      let provider = options.provider || 'openai'; // Default to OpenAI
      const model = options.model || 'auto';
      
      // Check if provider is configured
      if (!this.isConfigured[provider]) {
        // Fallback to any available provider
        const availableProviders = Object.keys(this.isConfigured).filter(p => this.isConfigured[p]);
        if (availableProviders.length === 0) {
          throw new Error('No AI providers configured');
        }
        strapi.log.warn(`Provider ${provider} not configured, falling back to ${availableProviders[0]}`);
        provider = availableProviders[0];
      }
      
      let result;
      
      // Call the appropriate provider
      switch (provider) {
        case 'openai':
          result = await this.callOpenAI(processedPrompt, model);
          break;
        case 'anthropic':
          result = await this.callAnthropic(processedPrompt, model);
          break;
        case 'gemini':
          result = await this.callGemini(processedPrompt, model);
          break;
        default:
          // If 'auto' is specified, try providers in order of preference
          const providerOrder = ['openai', 'anthropic', 'gemini'];
          for (const p of providerOrder) {
            if (this.isConfigured[p]) {
              strapi.log.info(`Auto-selecting provider: ${p}`);
              if (p === 'openai') result = await this.callOpenAI(processedPrompt, model);
              else if (p === 'anthropic') result = await this.callAnthropic(processedPrompt, model);
              else if (p === 'gemini') result = await this.callGemini(processedPrompt, model);
              break;
            }
          }
      }
      
      if (!result) {
        throw new Error('Failed to generate content with any provider');
      }
      
      // Return in the expected format
      return {
        content: result.response,
        provider: provider,
        model: result.model,
        cost: result.cost,
        success: true
      };
      
    } catch (error) {
      strapi.log.error('AI content generation failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
const aiProviderService = new AIProviderService();

module.exports = aiProviderService;