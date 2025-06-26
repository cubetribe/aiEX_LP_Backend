/**
 * Prompt Template Engine
 * Advanced templating system for AI prompts with campaign-type support
 * Handles dynamic content generation, variable substitution, and context-aware prompting
 */

'use strict';

const Handlebars = require('handlebars');

/**
 * Prompt Template Engine
 * Manages AI prompt templates for different campaign types and lead processing
 */
class PromptTemplateEngine {
  constructor(strapi) {
    this.strapi = strapi;
    this.templates = new Map();
    this.helpers = new Map();
    this.isInitialized = false;

    // Template categories
    this.categories = {
      LEAD_ANALYSIS: 'lead_analysis',
      CAMPAIGN_RESPONSE: 'campaign_response',
      EMAIL_CONTENT: 'email_content',
      SUMMARY: 'summary',
      VALIDATION: 'validation',
    };

    // Campaign type specific configurations
    this.campaignConfigs = {
      quiz: {
        primaryTemplate: 'quiz_analysis',
        responseFormat: 'detailed_analysis',
        contextWeights: { responses: 0.7, demographics: 0.2, campaign: 0.1 },
      },
      imageUpload: {
        primaryTemplate: 'image_analysis',
        responseFormat: 'visual_assessment',
        contextWeights: { image: 0.8, prompt: 0.2 },
      },
      chatbot: {
        primaryTemplate: 'conversation_analysis',
        responseFormat: 'conversational_summary',
        contextWeights: { conversation: 0.8, context: 0.2 },
      },
      textOnly: {
        primaryTemplate: 'text_analysis',
        responseFormat: 'comprehensive_review',
        contextWeights: { content: 0.9, demographics: 0.1 },
      },
      custom: {
        primaryTemplate: 'custom_analysis',
        responseFormat: 'flexible_output',
        contextWeights: { custom: 1.0 },
      },
    };

    // Initialize Handlebars helpers
    this.initializeHelpers();
  }

  /**
   * Initialize the template engine with default templates
   */
  async initialize() {
    try {
      this.strapi.log.info('📝 Initializing Prompt Template Engine...');

      // Load default templates
      await this.loadDefaultTemplates();

      // Register custom helpers
      this.registerHelpers();

      this.isInitialized = true;
      this.strapi.log.info('✅ Prompt Template Engine initialized');
      
      return true;
    } catch (error) {
      this.strapi.log.error('❌ Failed to initialize Prompt Template Engine:', error);
      throw error;
    }
  }

  /**
   * Generate prompt for lead analysis
   */
  async generateLeadAnalysisPrompt(lead, campaign, options = {}) {
    this.validateInitialization();

    const templateName = this.getTemplateForCampaign(campaign.campaignType, 'analysis');
    const context = this.buildLeadContext(lead, campaign, options);
    
    return this.renderTemplate(templateName, context, options);
  }

  /**
   * Generate campaign response prompt
   */
  async generateCampaignResponsePrompt(lead, campaign, analysisResult, options = {}) {
    this.validateInitialization();

    const templateName = this.getTemplateForCampaign(campaign.campaignType, 'response');
    const context = this.buildResponseContext(lead, campaign, analysisResult, options);
    
    return this.renderTemplate(templateName, context, options);
  }

  /**
   * Generate email content prompt
   */
  async generateEmailPrompt(lead, campaign, aiResult, options = {}) {
    this.validateInitialization();

    const templateName = 'email_content';
    const context = this.buildEmailContext(lead, campaign, aiResult, options);
    
    return this.renderTemplate(templateName, context, options);
  }

  /**
   * Generate summary prompt
   */
  async generateSummaryPrompt(data, summaryType, options = {}) {
    this.validateInitialization();

    const templateName = `summary_${summaryType}`;
    const context = this.buildSummaryContext(data, summaryType, options);
    
    return this.renderTemplate(templateName, context, options);
  }

  /**
   * Build comprehensive context for lead analysis
   */
  buildLeadContext(lead, campaign, options = {}) {
    const baseContext = {
      // Lead information
      lead: {
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        jobTitle: lead.jobTitle,
        responses: lead.responses || {},
        customFields: lead.customFields || {},
        submittedAt: lead.createdAt,
      },

      // Campaign information
      campaign: {
        title: campaign.title,
        type: campaign.campaignType,
        description: campaign.description,
        config: campaign.config || {},
        aiPromptTemplate: campaign.aiPromptTemplate,
        objectives: this.extractCampaignObjectives(campaign),
      },

      // Analysis context
      analysis: {
        purpose: options.purpose || 'lead_qualification',
        focus: options.focus || 'general',
        depth: options.depth || 'standard',
        outputFormat: options.outputFormat || 'structured',
      },

      // Metadata
      meta: {
        timestamp: new Date().toISOString(),
        platform: 'GoAIX',
        domain: 'quiz.goaiex.com',
        version: process.env.APP_VERSION || '1.0.0',
      },
    };

    // Add campaign-specific context
    return this.enhanceContextForCampaignType(baseContext, campaign, lead, options);
  }

  /**
   * Build context for campaign response generation
   */
  buildResponseContext(lead, campaign, analysisResult, options = {}) {
    return {
      // Include lead context
      ...this.buildLeadContext(lead, campaign, options),

      // Analysis results
      analysis: analysisResult,

      // Response configuration
      response: {
        tone: options.tone || campaign.config?.tone || 'professional',
        length: options.length || campaign.config?.responseLength || 'medium',
        format: options.format || campaign.config?.responseFormat || 'paragraph',
        personalization: options.personalization !== false,
        callToAction: campaign.config?.callToAction,
        nextSteps: campaign.config?.nextSteps,
      },

      // Branding and style
      branding: {
        companyName: 'GoAIX',
        website: 'quiz.goaiex.com',
        style: options.brandStyle || 'modern',
        voice: options.brandVoice || 'expert',
      },
    };
  }

  /**
   * Build context for email content generation
   */
  buildEmailContext(lead, campaign, aiResult, options = {}) {
    return {
      // Recipient information
      recipient: {
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        company: lead.company,
        jobTitle: lead.jobTitle,
      },

      // Email configuration
      email: {
        type: options.emailType || 'result_delivery',
        subject: options.subject || this.generateEmailSubject(lead, campaign),
        greeting: options.greeting || 'formal',
        closing: options.closing || 'professional',
        signature: options.signature || this.getDefaultSignature(),
      },

      // Content from AI analysis
      content: {
        mainMessage: aiResult.content,
        keyPoints: this.extractKeyPoints(aiResult.content),
        recommendations: this.extractRecommendations(aiResult.content),
        callToAction: campaign.config?.emailCallToAction,
      },

      // Campaign context
      campaign: {
        title: campaign.title,
        type: campaign.campaignType,
        completionDate: new Date().toISOString(),
      },

      // Branding
      branding: {
        companyName: 'GoAIX',
        website: 'quiz.goaiex.com',
        supportEmail: 'support@quiz.goaiex.com',
        logoUrl: options.logoUrl,
      },
    };
  }

  /**
   * Build context for summary generation
   */
  buildSummaryContext(data, summaryType, options = {}) {
    return {
      data,
      summaryType,
      scope: options.scope || 'comprehensive',
      focus: options.focus || 'key_insights',
      length: options.length || 'medium',
      format: options.format || 'bullet_points',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Enhance context based on campaign type
   */
  enhanceContextForCampaignType(context, campaign, lead, options) {
    const campaignType = campaign.campaignType;
    const config = this.campaignConfigs[campaignType];

    if (!config) {
      return context;
    }

    switch (campaignType) {
      case 'quiz':
        return this.enhanceQuizContext(context, campaign, lead);
      
      case 'imageUpload':
        return this.enhanceImageContext(context, campaign, lead);
      
      case 'chatbot':
        return this.enhanceChatbotContext(context, campaign, lead);
      
      case 'textOnly':
        return this.enhanceTextContext(context, campaign, lead);
      
      case 'custom':
        return this.enhanceCustomContext(context, campaign, lead, options);
      
      default:
        return context;
    }
  }

  /**
   * Enhance context for quiz campaigns
   */
  enhanceQuizContext(context, campaign, lead) {
    const questions = campaign.config?.questions || [];
    const responses = lead.responses || {};

    // Analyze quiz responses
    const analyzedResponses = questions.map(question => {
      const response = responses[question.id];
      return {
        question: question.question,
        answer: response,
        type: question.type,
        weight: question.weight || 1,
        category: question.category,
        options: question.options,
      };
    });

    // Calculate quiz metrics
    const completionRate = Object.keys(responses).length / questions.length;
    const scoreWeighting = campaign.config?.scoring || {};

    context.quiz = {
      questions: analyzedResponses,
      completionRate,
      totalQuestions: questions.length,
      answeredQuestions: Object.keys(responses).length,
      scoring: scoreWeighting,
      categories: this.categorizeMQuizResponses(analyzedResponses),
    };

    return context;
  }

  /**
   * Enhance context for image upload campaigns
   */
  enhanceImageContext(context, campaign, lead) {
    const imageData = lead.responses?.imageData || lead.customFields?.imageData;
    
    context.image = {
      hasImage: !!imageData,
      imageType: this.detectImageType(imageData),
      analysisPrompt: campaign.config?.analysisPrompt,
      analysisCategories: campaign.config?.analysisCategories || [],
      expectedInsights: campaign.config?.expectedInsights || [],
    };

    return context;
  }

  /**
   * Enhance context for chatbot campaigns
   */
  enhanceChatbotContext(context, campaign, lead) {
    const conversation = lead.responses?.conversation || [];
    
    context.conversation = {
      messages: conversation,
      messageCount: conversation.length,
      duration: this.calculateConversationDuration(conversation),
      topics: this.extractConversationTopics(conversation),
      sentiment: this.analyzeConversationSentiment(conversation),
      keyMoments: this.identifyKeyMoments(conversation),
    };

    return context;
  }

  /**
   * Enhance context for text-only campaigns
   */
  enhanceTextContext(context, campaign, lead) {
    const textResponses = Object.values(lead.responses || {}).filter(r => typeof r === 'string');
    const combinedText = textResponses.join(' ');

    context.text = {
      responses: textResponses,
      combinedLength: combinedText.length,
      wordCount: combinedText.split(/\s+/).length,
      keyThemes: this.extractTextThemes(combinedText),
      sentiment: this.analyzeTextSentiment(combinedText),
      complexity: this.assessTextComplexity(combinedText),
    };

    return context;
  }

  /**
   * Enhance context for custom campaigns
   */
  enhanceCustomContext(context, campaign, lead, options) {
    const customConfig = campaign.config?.customAnalysis || {};
    
    context.custom = {
      configuration: customConfig,
      dataStructure: this.analyzeCustomDataStructure(lead.responses),
      processingHints: options.processingHints || [],
      expectedOutputs: customConfig.expectedOutputs || [],
    };

    return context;
  }

  /**
   * Render template with context
   */
  async renderTemplate(templateName, context, options = {}) {
    const template = this.getTemplate(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    try {
      // Add global helpers and data
      const enhancedContext = {
        ...context,
        ...this.getGlobalContext(),
      };

      // Compile and render template
      const compiledTemplate = Handlebars.compile(template);
      const rendered = compiledTemplate(enhancedContext);

      // Post-process if needed
      return this.postProcessTemplate(rendered, options);
    } catch (error) {
      this.strapi.log.error('Template rendering failed:', error);
      throw new Error(`Failed to render template '${templateName}': ${error.message}`);
    }
  }

  /**
   * Get template for campaign type and purpose
   */
  getTemplateForCampaign(campaignType, purpose) {
    const config = this.campaignConfigs[campaignType];
    if (!config) {
      return `${purpose}_generic`;
    }

    const templateName = purpose === 'analysis' 
      ? config.primaryTemplate 
      : `${campaignType}_${purpose}`;

    return this.templates.has(templateName) ? templateName : `${purpose}_generic`;
  }

  /**
   * Load default templates
   */
  async loadDefaultTemplates() {
    // Quiz Analysis Template
    this.setTemplate('quiz_analysis', `
Analyze the quiz responses for {{lead.firstName}} {{lead.lastName}} who completed the "{{campaign.title}}" quiz.

LEAD INFORMATION:
- Name: {{lead.firstName}} {{lead.lastName}}
- Email: {{lead.email}}
- Company: {{#if lead.company}}{{lead.company}}{{else}}Not provided{{/if}}
- Job Title: {{#if lead.jobTitle}}{{lead.jobTitle}}{{else}}Not provided{{/if}}

QUIZ PERFORMANCE:
- Completion Rate: {{formatPercentage quiz.completionRate}}
- Total Questions: {{quiz.totalQuestions}}
- Questions Answered: {{quiz.answeredQuestions}}

RESPONSES ANALYSIS:
{{#each quiz.questions}}
{{@index}}. {{question}}
   Answer: {{answer}}
   Type: {{type}}
   {{#if category}}Category: {{category}}{{/if}}

{{/each}}

ANALYSIS OBJECTIVES:
{{#each campaign.objectives}}
- {{this}}
{{/each}}

Please provide a comprehensive analysis that includes:
1. Lead qualification score (1-100)
2. Key insights from responses
3. Personality/business style assessment
4. Specific recommendations
5. Next steps for engagement

Format the response as structured JSON with the following schema:
{
  "leadScore": number,
  "qualification": "hot|warm|cold|unqualified",
  "insights": string[],
  "personality": {
    "traits": string[],
    "workStyle": string,
    "decisionMaking": string
  },
  "recommendations": string[],
  "nextSteps": string[],
  "summary": string
}
    `);

    // Image Analysis Template
    this.setTemplate('image_analysis', `
Analyze the uploaded image for {{lead.firstName}} {{lead.lastName}} in the context of the "{{campaign.title}}" campaign.

LEAD INFORMATION:
- Name: {{lead.firstName}} {{lead.lastName}}
- Email: {{lead.email}}
- Company: {{#if lead.company}}{{lead.company}}{{else}}Not provided{{/if}}

IMAGE ANALYSIS CONTEXT:
{{#if campaign.config.analysisPrompt}}
Campaign Specific Instructions: {{campaign.config.analysisPrompt}}
{{/if}}

{{#if image.analysisCategories}}
Focus Areas:
{{#each image.analysisCategories}}
- {{this}}
{{/each}}
{{/if}}

Please analyze the uploaded image and provide insights in the following areas:
1. Visual content assessment
2. Quality and professionalism evaluation
3. Relevance to campaign objectives
4. Business/personal insights derivable from the image
5. Recommendations based on visual analysis

Provide a structured analysis with actionable insights for lead qualification and follow-up strategy.
    `);

    // Campaign Response Templates
    this.setTemplate('quiz_response', `
Based on your analysis, create a personalized response for {{lead.firstName}} who completed our {{campaign.title}}.

ANALYSIS RESULTS:
Lead Score: {{analysis.leadScore}}
Qualification: {{analysis.qualification}}
Key Insights: {{join analysis.insights ", "}}

RESPONSE REQUIREMENTS:
- Tone: {{response.tone}}
- Length: {{response.length}}
- Format: {{response.format}}
- Personalization: {{#if response.personalization}}High{{else}}Standard{{/if}}

Create a {{response.length}} response that:
1. Acknowledges their quiz completion
2. Highlights their key strengths/traits identified
3. Provides personalized insights
4. Includes relevant recommendations
5. {{#if response.callToAction}}Ends with: {{response.callToAction}}{{/if}}

Keep the tone {{response.tone}} and make it feel personally crafted for {{lead.firstName}}.
    `);

    // Email Content Template
    this.setTemplate('email_content', `
Create a professional email to send the AI analysis results to {{recipient.firstName}}.

EMAIL DETAILS:
- Subject: {{email.subject}}
- Greeting Style: {{email.greeting}}
- Closing Style: {{email.closing}}

RECIPIENT:
- Name: {{recipient.firstName}} {{recipient.lastName}}
- Company: {{#if recipient.company}}{{recipient.company}}{{else}}Individual{{/if}}
- Email: {{recipient.email}}

CONTENT TO INCLUDE:
{{content.mainMessage}}

KEY POINTS:
{{#each content.keyPoints}}
- {{this}}
{{/each}}

{{#if content.recommendations}}
RECOMMENDATIONS:
{{#each content.recommendations}}
- {{this}}
{{/each}}
{{/if}}

{{#if content.callToAction}}
CALL TO ACTION: {{content.callToAction}}
{{/if}}

Create a well-structured email that:
1. Has an engaging subject line
2. Uses appropriate greeting for {{email.greeting}} style
3. Delivers the content clearly and engagingly
4. Includes the key points naturally
5. Ends with {{email.closing}} closing
6. Includes {{branding.companyName}} signature

Format as a complete email ready to send.
    `);

    // Generic templates for fallback
    this.setTemplate('analysis_generic', `
Analyze the provided lead information for {{lead.firstName}} {{lead.lastName}} in the context of the "{{campaign.title}}" campaign.

LEAD DATA:
{{leadSummary lead}}

CAMPAIGN CONTEXT:
{{campaignSummary campaign}}

Provide a comprehensive analysis including lead qualification, key insights, and recommendations.
    `);

    this.setTemplate('response_generic', `
Create a personalized response for {{lead.firstName}} based on the analysis results.

ANALYSIS: {{analysisSummary analysis}}

Create an engaging, personalized response that addresses their specific situation and provides value.
    `);
  }

  /**
   * Initialize Handlebars helpers
   */
  initializeHelpers() {
    // Format percentage
    this.helpers.set('formatPercentage', (value) => {
      return `${Math.round(value * 100)}%`;
    });

    // Join array with separator
    this.helpers.set('join', (array, separator) => {
      return Array.isArray(array) ? array.join(separator) : '';
    });

    // Lead summary helper
    this.helpers.set('leadSummary', (lead) => {
      return `Name: ${lead.firstName} ${lead.lastName}
Email: ${lead.email}
Company: ${lead.company || 'Not provided'}
Job Title: ${lead.jobTitle || 'Not provided'}
Responses: ${JSON.stringify(lead.responses, null, 2)}`;
    });

    // Campaign summary helper
    this.helpers.set('campaignSummary', (campaign) => {
      return `Title: ${campaign.title}
Type: ${campaign.type}
Description: ${campaign.description || 'No description'}
Configuration: ${JSON.stringify(campaign.config, null, 2)}`;
    });

    // Analysis summary helper
    this.helpers.set('analysisSummary', (analysis) => {
      return `Score: ${analysis.leadScore || 'N/A'}
Qualification: ${analysis.qualification || 'N/A'}
Key Insights: ${Array.isArray(analysis.insights) ? analysis.insights.join(', ') : 'N/A'}`;
    });

    // Date formatting helper
    this.helpers.set('formatDate', (date, format) => {
      const d = new Date(date);
      return d.toLocaleDateString('en-US');
    });

    // Conditional helper
    this.helpers.set('ifEquals', function(arg1, arg2, options) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });
  }

  /**
   * Register all helpers with Handlebars
   */
  registerHelpers() {
    for (const [name, helper] of this.helpers) {
      Handlebars.registerHelper(name, helper);
    }
  }

  /**
   * Get global context available to all templates
   */
  getGlobalContext() {
    return {
      timestamp: new Date().toISOString(),
      platform: 'GoAIX',
      version: process.env.APP_VERSION || '1.0.0',
      domain: 'quiz.goaiex.com',
    };
  }

  /**
   * Post-process rendered template
   */
  postProcessTemplate(rendered, options = {}) {
    let processed = rendered;

    // Trim whitespace
    processed = processed.trim();

    // Remove excessive line breaks
    processed = processed.replace(/\n{3,}/g, '\n\n');

    // Apply any custom post-processing
    if (options.postProcessor && typeof options.postProcessor === 'function') {
      processed = options.postProcessor(processed);
    }

    return processed;
  }

  /**
   * Utility methods for context enhancement
   */
  extractCampaignObjectives(campaign) {
    const defaultObjectives = ['Lead qualification', 'Personalized insights', 'Next step recommendations'];
    return campaign.config?.objectives || defaultObjectives;
  }

  categorizeMQuizResponses(responses) {
    const categories = {};
    
    responses.forEach(response => {
      if (response.category) {
        if (!categories[response.category]) {
          categories[response.category] = [];
        }
        categories[response.category].push(response);
      }
    });

    return categories;
  }

  generateEmailSubject(lead, campaign) {
    return `Your ${campaign.title} Results, ${lead.firstName}`;
  }

  getDefaultSignature() {
    return `Best regards,
The GoAIX Team
quiz.goaiex.com
support@quiz.goaiex.com`;
  }

  extractKeyPoints(content) {
    // Simple extraction - could be enhanced with NLP
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 3).map(s => s.trim());
  }

  extractRecommendations(content) {
    // Extract sentences that contain recommendation keywords
    const sentences = content.split(/[.!?]+/);
    const recommendations = sentences.filter(s => 
      /recommend|suggest|should|consider|try|implement/i.test(s)
    );
    return recommendations.slice(0, 3).map(s => s.trim());
  }

  // Placeholder methods for advanced analysis (would be implemented with proper NLP libraries)
  detectImageType(imageData) { return 'image/jpeg'; }
  calculateConversationDuration(conversation) { return '5 minutes'; }
  extractConversationTopics(conversation) { return ['business', 'goals']; }
  analyzeConversationSentiment(conversation) { return 'positive'; }
  identifyKeyMoments(conversation) { return []; }
  extractTextThemes(text) { return ['business', 'growth']; }
  analyzeTextSentiment(text) { return 'neutral'; }
  assessTextComplexity(text) { return 'medium'; }
  analyzeCustomDataStructure(data) { return Object.keys(data || {}); }

  /**
   * Template management methods
   */
  setTemplate(name, content) {
    this.templates.set(name, content);
  }

  getTemplate(name) {
    return this.templates.get(name);
  }

  hasTemplate(name) {
    return this.templates.has(name);
  }

  removeTemplate(name) {
    return this.templates.delete(name);
  }

  getAllTemplates() {
    return Array.from(this.templates.keys());
  }

  validateInitialization() {
    if (!this.isInitialized) {
      throw new Error('Prompt Template Engine not initialized');
    }
  }

  /**
   * Get engine status and information
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      templateCount: this.templates.size,
      helperCount: this.helpers.size,
      supportedCampaignTypes: Object.keys(this.campaignConfigs),
      categories: Object.values(this.categories),
    };
  }
}

module.exports = { PromptTemplateEngine };