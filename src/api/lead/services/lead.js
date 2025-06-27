'use strict';

/**
 * Lead Service
 * Business logic for lead management
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::lead.lead', ({ strapi }) => ({
  /**
   * Calculate lead score based on responses
   */
  calculateLeadScore(responses) {
    // Basic scoring algorithm - can be enhanced later
    let score = 0;
    
    if (responses && typeof responses === 'object') {
      const responseCount = Object.keys(responses).length;
      score = Math.min(responseCount * 10, 100); // 10 points per response, max 100
    }
    
    return score;
  },

  /**
   * Determine lead quality based on score
   */
  calculateLeadQuality(score) {
    if (score >= 80) return 'hot';
    if (score >= 60) return 'warm';
    if (score >= 30) return 'cold';
    return 'unqualified';
  },

  /**
   * Enhanced process lead submission with conditional scoring
   */
  async processLeadSubmission(data) {
    try {
      // Get campaign for conditional scoring
      const campaignData = await strapi.entityService.findOne('api::campaign.campaign', data.campaign, {
        fields: ['config', 'jsonCode']
      });

      // Calculate score and quality with campaign logic
      const { leadScore, leadQuality } = this.calculateEnhancedScore(data.responses, campaignData);

      // Create lead with calculated values
      const lead = await strapi.entityService.create('api::lead.lead', {
        data: {
          ...data,
          leadScore,
          leadQuality,
          responses: data.responses || {}
        },
        populate: ['campaign']
      });

      strapi.log.info(`Lead created: ${lead.email} (Score: ${leadScore}, Quality: ${leadQuality})`);
      
      // Handle result delivery based on campaign configuration
      await this.handleResultDelivery(lead, campaignData);
      
      return lead;
    } catch (error) {
      strapi.log.error('Error processing lead submission:', error);
      throw error;
    }
  },

  /**
   * Enhanced scoring with conditional logic
   */
  calculateEnhancedScore(responses, campaignData) {
    if (!responses || Object.keys(responses).length === 0) {
      return { leadScore: 30, leadQuality: 'cold' };
    }

    let config = campaignData?.config || {};
    
    // Merge jsonCode if present (for bot-generated configs)
    if (campaignData?.jsonCode && campaignData.jsonCode.trim()) {
      try {
        const jsonConfig = JSON.parse(campaignData.jsonCode);
        config = { ...config, ...jsonConfig };
      } catch (error) {
        strapi.log.error('Invalid JSON in campaign jsonCode:', error);
      }
    }

    // Use conditional scoring if defined
    if (config.scoring?.logic === 'conditional') {
      return this.calculateConditionalScore(responses, config.scoring);
    }

    // Fall back to intelligent default scoring
    return this.calculateIntelligentScore(responses);
  },

  /**
   * Conditional scoring based on campaign rules
   */
  calculateConditionalScore(responses, scoringConfig) {
    const rules = scoringConfig.rules || [];
    const defaultRule = scoringConfig.default || { leadScore: 50, leadQuality: 'warm' };

    // Check each rule in order
    for (const rule of rules) {
      if (this.matchesCondition(responses, rule.if)) {
        return rule.then;
      }
    }

    return defaultRule;
  },

  /**
   * Check if responses match a condition
   */
  matchesCondition(responses, conditions) {
    return Object.entries(conditions).every(([field, expectedValue]) => {
      const userValue = responses[field];
      
      if (Array.isArray(expectedValue)) {
        return expectedValue.includes(userValue);
      }
      
      return userValue === expectedValue;
    });
  },

  /**
   * Intelligent scoring for Privat vs. Gewerblich
   */
  calculateIntelligentScore(responses) {
    let score = 50; // Base score

    const responseCount = Object.keys(responses).length;
    score += responseCount * 8; // +8 per question answered

    const responseValues = Object.values(responses).join(' ').toLowerCase();
    
    // Business scoring (higher scores)
    if (responseValues.includes('unternehmer') || responseValues.includes('business')) {
      score += 25;
      
      if (responseValues.includes('200+') || responseValues.includes('über 200')) {
        score += 35; // Large enterprise = hot lead
      } else if (responseValues.includes('51-200')) {
        score += 25; // Medium enterprise = warm lead  
      } else if (responseValues.includes('11-50')) {
        score += 15; // Small business = warm lead
      } else if (responseValues.includes('1-10')) {
        score += 10; // Micro business = cold lead
      }
    }

    // Private person scoring (moderate scores)
    if (responseValues.includes('privatperson') || responseValues.includes('private')) {
      score += 10;
      
      if (responseValues.includes('über 100k') || responseValues.includes('100k+')) {
        score += 20; // High income private = warm lead
      } else if (responseValues.includes('60k-100k')) {
        score += 15; // Good income = cold lead
      } else if (responseValues.includes('30k-60k')) {
        score += 10; // Average income = cold lead
      }
    }

    // Bonus for engagement indicators
    if (responseValues.includes('innovation') || responseValues.includes('growth')) {
      score += 10;
    }

    // Ensure score bounds
    score = Math.min(100, Math.max(0, score));

    // Determine quality
    let leadQuality;
    if (score >= 80) {
      leadQuality = 'hot';
    } else if (score >= 60) {
      leadQuality = 'warm';
    } else if (score >= 40) {
      leadQuality = 'cold';
    } else {
      leadQuality = 'unqualified';
    }

    return { leadScore: score, leadQuality };
  },

  /**
   * Get leads by campaign
   */
  async getLeadsByCampaign(campaignId, options = {}) {
    try {
      const leads = await strapi.entityService.findMany('api::lead.lead', {
        filters: {
          campaign: {
            id: campaignId
          }
        },
        populate: ['campaign'],
        ...options
      });

      return leads;
    } catch (error) {
      strapi.log.error('Error fetching leads by campaign:', error);
      throw error;
    }
  },

  /**
   * Get lead statistics
   */
  async getLeadStats(campaignId = null) {
    try {
      const filters = campaignId ? { campaign: { id: campaignId } } : {};
      
      const [total, hot, warm, cold, unqualified] = await Promise.all([
        strapi.entityService.count('api::lead.lead', { filters }),
        strapi.entityService.count('api::lead.lead', { 
          filters: { ...filters, leadQuality: 'hot' }
        }),
        strapi.entityService.count('api::lead.lead', { 
          filters: { ...filters, leadQuality: 'warm' }
        }),
        strapi.entityService.count('api::lead.lead', { 
          filters: { ...filters, leadQuality: 'cold' }
        }),
        strapi.entityService.count('api::lead.lead', { 
          filters: { ...filters, leadQuality: 'unqualified' }
        })
      ]);

      return {
        total,
        byQuality: { hot, warm, cold, unqualified },
        averageScore: await this.getAverageScore(filters)
      };
    } catch (error) {
      strapi.log.error('Error calculating lead stats:', error);
      throw error;
    }
  },

  /**
   * Handle result delivery based on campaign configuration
   */
  async handleResultDelivery(lead, campaignData) {
    try {
      const resultConfig = campaignData?.resultDisplayConfig || {};
      const deliveryMode = campaignData?.resultDeliveryMode || 'show_only';
      
      // Generate AI result if needed
      let aiResult = null;
      if (deliveryMode !== 'show_only' || resultConfig.showOnScreen) {
        aiResult = await this.generateAIResult(lead, campaignData);
        
        // Update lead with AI result
        await strapi.entityService.update('api::lead.lead', lead.id, {
          data: {
            aiResult,
            aiProcessingStatus: 'completed'
          }
        });
      }
      
      // Send email if required
      if (deliveryMode === 'email_only' || deliveryMode === 'show_and_email' || resultConfig.sendEmail) {
        await this.sendResultEmail(lead, campaignData, aiResult);
      }
      
      strapi.log.info(`Result delivery completed for lead ${lead.id} (mode: ${deliveryMode})`);
      
    } catch (error) {
      strapi.log.error('Error handling result delivery:', error);
      
      // Update lead with error status
      await strapi.entityService.update('api::lead.lead', lead.id, {
        data: {
          aiProcessingStatus: 'failed'
        }
      });
    }
  },

  /**
   * Generate AI result based on responses
   */
  async generateAIResult(lead, campaignData) {
    try {
      // For now, generate a simple result based on lead quality and responses
      // Later this can be enhanced with actual AI integration
      
      const { leadScore, leadQuality } = lead;
      const responses = lead.responses || {};
      const campaignTitle = campaignData?.title || 'Quiz';
      
      let result = '';
      
      // Quality-based messaging
      if (leadQuality === 'hot') {
        result += `🔥 Ausgezeichnet! Sie sind ein Premium-Lead mit ${leadScore}/100 Punkten.\n\n`;
        result += `Basierend auf Ihren Antworten sehen wir großes Potenzial für eine Zusammenarbeit. `;
        result += `Ihre Bedürfnisse decken sich perfekt mit unseren Lösungen.\n\n`;
      } else if (leadQuality === 'warm') {
        result += `⭐ Sehr gut! Sie haben ${leadScore}/100 Punkte erreicht.\n\n`;
        result += `Ihre Antworten zeigen klares Interesse an unseren Lösungen. `;
        result += `Mit den richtigen Maßnahmen können wir Ihnen optimal helfen.\n\n`;
      } else if (leadQuality === 'cold') {
        result += `💡 Interessant! Sie haben ${leadScore}/100 Punkte erreicht.\n\n`;
        result += `Ihre Antworten zeigen, dass Sie noch am Anfang stehen. `;
        result += `Wir haben einige Empfehlungen für Ihren Einstieg.\n\n`;
      } else {
        result += `📋 Vielen Dank für Ihre Teilnahme!\n\n`;
        result += `Ihre Antworten geben uns einen ersten Einblick. `;
        result += `Hier sind einige allgemeine Empfehlungen für Sie.\n\n`;
      }
      
      // Add personalized recommendations based on responses
      result += this.generatePersonalizedRecommendations(responses, leadQuality);
      
      // Add next steps
      result += `\n\n📞 Nächste Schritte:\n`;
      if (leadQuality === 'hot') {
        result += `• Sprechen Sie direkt mit unserem Experten-Team\n`;
        result += `• Erhalten Sie eine kostenlose Erstberatung\n`;
        result += `• Individuelle Lösungsempfehlung binnen 24h\n`;
      } else if (leadQuality === 'warm') {
        result += `• Laden Sie unseren kostenlosen Leitfaden herunter\n`;
        result += `• Buchen Sie ein unverbindliches Beratungsgespräch\n`;
        result += `• Erhalten Sie maßgeschneiderte Empfehlungen\n`;
      } else {
        result += `• Informieren Sie sich über unsere Basis-Angebote\n`;
        result += `• Nutzen Sie unsere kostenlosen Ressourcen\n`;
        result += `• Bleiben Sie über unseren Newsletter informiert\n`;
      }
      
      return result;
      
    } catch (error) {
      strapi.log.error('Error generating AI result:', error);
      return 'Vielen Dank für Ihre Teilnahme! Wir werden uns in Kürze bei Ihnen melden.';
    }
  },

  /**
   * Generate personalized recommendations
   */
  generatePersonalizedRecommendations(responses, leadQuality) {
    let recommendations = '🎯 Personalisierte Empfehlungen:\n\n';
    
    const responseText = Object.values(responses).join(' ').toLowerCase();
    
    // Business vs. Private recommendations
    if (responseText.includes('unternehmer') || responseText.includes('business')) {
      if (responseText.includes('200+')) {
        recommendations += `• Enterprise-Lösungen mit dediziertem Support\n`;
        recommendations += `• Skalierbare AI-Integration für Großunternehmen\n`;
        recommendations += `• Custom Development & White-Label Optionen\n`;
      } else if (responseText.includes('50')) {
        recommendations += `• Business-Pakete mit erweiterten Features\n`;
        recommendations += `• Mittelstands-optimierte AI-Lösungen\n`;
        recommendations += `• ROI-fokussierte Implementierung\n`;
      } else {
        recommendations += `• Startup-freundliche Einstiegspakete\n`;
        recommendations += `• Kosteneffiziente AI-Tools für kleine Teams\n`;
        recommendations += `• Schnelle Implementierung ohne hohe Vorlaufkosten\n`;
      }
    } else if (responseText.includes('privatperson') || responseText.includes('private')) {
      if (responseText.includes('100k')) {
        recommendations += `• Premium AI-Tools für anspruchsvolle Anwender\n`;
        recommendations += `• 1:1 Coaching und persönliche Betreuung\n`;
        recommendations += `• Exklusive Masterkurse und Workshops\n`;
      } else {
        recommendations += `• Einsteigerfreundliche AI-Kurse\n`;
        recommendations += `• Community-Support und Gruppencoaching\n`;
        recommendations += `• Praxisnahe Tutorials und Anwendungen\n`;
      }
    }
    
    // Experience-based recommendations
    if (responseText.includes('keine') && responseText.includes('erfahrung')) {
      recommendations += `• Grundlagen-Kurs "AI für Einsteiger"\n`;
      recommendations += `• Step-by-Step Video-Tutorials\n`;
      recommendations += `• Persönlicher Mentor für die ersten Schritte\n`;
    } else if (responseText.includes('viel') || responseText.includes('experte')) {
      recommendations += `• Advanced AI-Strategien und Best Practices\n`;
      recommendations += `• Beta-Zugang zu neuesten Tools\n`;
      recommendations += `• Networking mit anderen AI-Experten\n`;
    }
    
    return recommendations;
  },

  /**
   * Send result email using email service
   */
  async sendResultEmail(lead, campaignData, aiResult) {
    try {
      const emailService = require('../../../services/email.service');
      const campaign = await strapi.entityService.findOne('api::campaign.campaign', campaignData.id);
      
      // Check if email service is configured
      if (!emailService.isConfigured) {
        strapi.log.info('Email service not configured - skipping email send');
        return { 
          success: false, 
          reason: 'Email service not configured',
          skipReason: 'NO_EMAIL_CONFIG'
        };
      }
      
      const emailResult = await emailService.sendResultEmail(lead, campaign, aiResult);
      
      if (emailResult.success) {
        strapi.log.info(`Result email sent to ${lead.email}: ${emailResult.messageId}`);
      } else {
        strapi.log.warn(`Failed to send result email to ${lead.email}: ${emailResult.reason || emailResult.error}`);
      }
      
      return emailResult;
    } catch (error) {
      strapi.log.error('Error sending result email:', error);
      return { 
        success: false, 
        error: error.message,
        skipReason: 'EMAIL_SERVICE_ERROR'
      };
    }
  },

  /**
   * Get average lead score
   */
  async getAverageScore(filters = {}) {
    try {
      const leads = await strapi.entityService.findMany('api::lead.lead', {
        filters,
        fields: ['leadScore']
      });

      if (leads.length === 0) return 0;
      
      const totalScore = leads.reduce((sum, lead) => sum + (lead.leadScore || 0), 0);
      return Math.round(totalScore / leads.length);
    } catch (error) {
      strapi.log.error('Error calculating average score:', error);
      return 0;
    }
  }
}));