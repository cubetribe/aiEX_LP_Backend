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
      console.log('--- 🎯 CHECKPOINT 1: processLeadSubmission STARTED ---');
      console.log('--- Input data:', JSON.stringify(data, null, 2));
      
      // DEBUG: Log incoming data
      strapi.log.info('🔍 Lead Submission Debug:', {
        firstName: data.firstName,
        email: data.email,
        responsesType: typeof data.responses,
        responsesKeys: data.responses ? Object.keys(data.responses) : [],
        responsesContent: data.responses,
        campaign: data.campaign
      });

      console.log('--- 🎯 CHECKPOINT 2: Fetching campaign data ---');
      // Get campaign for conditional scoring
      const campaignData = await strapi.entityService.findOne('api::campaign.campaign', data.campaign, {
        fields: ['config', 'jsonCode', 'resultDeliveryMode']
      });
      console.log('--- 🎯 CHECKPOINT 3: Campaign data retrieved ---');

      console.log('--- 🎯 CHECKPOINT 4: Calculating lead score ---');
      // Calculate score and quality with campaign logic
      const { leadScore, leadQuality } = this.calculateEnhancedScore(data.responses, campaignData);
      console.log('--- 🎯 CHECKPOINT 5: Lead score calculated:', { leadScore, leadQuality });

      // DEBUG: Log before database save
      const leadDataToSave = {
        ...data,
        leadScore,
        leadQuality,
        responses: data.responses || {}
      };
      strapi.log.info('🔍 Lead Data to Save:', leadDataToSave);

      console.log('--- 🎯 CHECKPOINT 6: Creating lead in database ---');
      // Create lead with calculated values
      const lead = await strapi.entityService.create('api::lead.lead', {
        data: leadDataToSave,
        populate: ['campaign']
      });
      console.log('--- 🎯 CHECKPOINT 7: Lead created successfully, ID:', lead.id);

      // DEBUG: Log after database save
      strapi.log.info('🔍 Lead Created:', {
        id: lead.id,
        firstName: lead.firstName,
        email: lead.email,
        responses: lead.responses,
        responsesType: typeof lead.responses
      });

      strapi.log.info(`Lead created: ${lead.email} (Score: ${leadScore}, Quality: ${leadQuality})`);
      
      // PRODUCTION-READY ARCHITECTURE - Immediate with Async Benefits
      console.log('--- 🎯 CHECKPOINT 8: Starting PRODUCTION-READY processing ---');
      strapi.log.info(`🚀 Starting IMMEDIATE AI processing for lead ${lead.id}`);
      
      try {
        // IMMEDIATE PROCESSING - Proven to work on Railway
        console.log('--- 🎯 CHECKPOINT 9: Processing immediately ---');
        const processedLead = await this.processLeadWithAI(lead.id);
        console.log('--- 🎯 CHECKPOINT 10: AI processing completed ---');
        strapi.log.info(`✅ AI processing completed for lead ${lead.id}`);
        
        // ASYNC JOBS - Optional enhancements (email, analytics, export)
        const deliveryMode = campaignData?.resultDeliveryMode || 'show_only';
        if (deliveryMode === 'show_and_email' || deliveryMode === 'email_only') {
          try {
            console.log('--- 🎯 CHECKPOINT 11: Sending email ---');
            if (strapi.emailService) {
              await strapi.emailService.sendLeadResult(processedLead);
              console.log('--- 🎯 CHECKPOINT 12: Email sent successfully ---');
              strapi.log.info(`📧 Email sent for lead ${lead.id}`);
            }
          } catch (emailError) {
            // Email failure doesn't break the process
            console.log('--- 🚨 EMAIL ERROR (non-critical) ---', emailError);
            strapi.log.warn(`📧 Email failed for lead ${lead.id}:`, emailError);
          }
        }
        
        // BACKGROUND JOBS - Analytics and export (non-blocking)
        if (strapi.queueService) {
          try {
            await strapi.queueService.addAnalyticsJob({
              event: 'lead_processed',
              data: { leadId: lead.id, campaignId: campaignData.id }
            });
            
            if (campaignData.googleSheetId) {
              await strapi.queueService.addSheetsExportJob({
                leadId: lead.id,
                sheetId: campaignData.googleSheetId
              });
            }
          } catch (bgError) {
            // Background job failures don't break the main process
            strapi.log.warn(`📊 Background jobs failed for lead ${lead.id}:`, bgError);
          }
        }
        
      } catch (error) {
        console.log('--- 🚨 PROCESSING ERROR ---', error);
        strapi.log.error(`❌ AI processing failed for lead ${lead.id}:`, error);
        
        // Mark lead as failed
        await strapi.entityService.update('api::lead.lead', lead.id, {
          data: { aiProcessingStatus: 'failed' }
        });
      }
      
      console.log('--- 🎯 CHECKPOINT 11: Lead submission completed - processing in background ---');
      return lead;
    } catch (error) {
      console.log('--- 🚨 CRITICAL ERROR - CRASH POINT FOUND ---');
      console.log('--- Error details:', error);
      console.log('--- Stack trace:', error.stack);
      strapi.log.error('Error processing lead submission:', error);
      throw error;
    }
  },

  /**
   * Handle result delivery using queue system
   */
  async handleQueuedResultDelivery(lead, campaignData) {
    try {
      const resultConfig = campaignData?.resultDisplayConfig || {};
      const deliveryMode = campaignData?.resultDeliveryMode || 'show_only';
      
      strapi.log.info(`🚀 Queuing result delivery for lead ${lead.id} (mode: ${deliveryMode})`);
      strapi.log.info(`🔍 Debug - resultConfig:`, JSON.stringify(resultConfig));
      strapi.log.info(`🔍 Debug - deliveryMode: ${deliveryMode}, showOnScreen: ${resultConfig.showOnScreen}`);
      strapi.log.info(`🔍 Debug - condition check: deliveryMode !== 'show_only' = ${deliveryMode !== 'show_only'}, resultConfig.showOnScreen = ${resultConfig.showOnScreen}`);
      strapi.log.info(`🔍 Debug - queueService available: ${!!strapi.queueService}`);

      // Queue AI processing job with fallback to immediate processing
      if (deliveryMode !== 'show_only' || resultConfig.showOnScreen) {
        strapi.log.info(`🎯 About to queue AI processing job for lead ${lead.id}`);
        try {
          // Try queue first
          await strapi.queueService.addAIProcessingJob({
            leadId: lead.id,
            campaignId: campaignData.id
          }, {
            priority: lead.leadQuality === 'hot' ? 'high' : 'normal'
          });
          strapi.log.info(`✅ AI processing job queued successfully for lead ${lead.id}`);
        } catch (aiJobError) {
          strapi.log.warn(`⚠️ Queue failed for lead ${lead.id}, falling back to immediate processing:`, aiJobError);
          
          // FALLBACK: Process immediately when queue fails
          try {
            strapi.log.info(`🔄 Starting immediate AI processing for lead ${lead.id}`);
            const processedLead = await this.processLeadWithAI(lead.id);
            strapi.log.info(`✅ Immediate AI processing completed for lead ${lead.id}`);
            
            // Send email if configured
            if (deliveryMode === 'show_and_email' || deliveryMode === 'email_only') {
              try {
                await strapi.emailService.sendLeadResult(processedLead);
                strapi.log.info(`📧 Email sent for lead ${lead.id}`);
              } catch (emailError) {
                strapi.log.error(`📧 Email failed for lead ${lead.id}:`, emailError);
              }
            }
          } catch (immediateError) {
            strapi.log.error(`❌ Immediate processing also failed for lead ${lead.id}:`, immediateError);
            // Don't throw - let the lead exist in pending state for manual reprocess
          }
        }
      } else {
        strapi.log.info(`⏭️ Skipping AI processing job for lead ${lead.id} - condition not met`);
      }

      // Queue sheets export if configured
      if (campaignData.googleSheetId) {
        await strapi.queueService.addSheetsExportJob({
          leadId: lead.id,
          campaignId: campaignData.id
        });
      }

      // Queue analytics tracking
      await strapi.queueService.addAnalyticsJob({
        event: 'lead_created',
        data: {
          leadId: lead.id,
          campaignId: campaignData.id,
          leadScore: lead.leadScore,
          leadQuality: lead.leadQuality
        }
      });

      strapi.log.info(`✅ Jobs queued successfully for lead ${lead.id}`);
      
    } catch (error) {
      strapi.log.error('Error queuing result delivery:', error);
      // Fall back to immediate processing
      await this.handleResultDelivery(lead, campaignData);
    }
  },

  /**
   * Process lead with AI (for queue processing)
   */
  async processLeadWithAI(leadId) {
    try {
      console.log('--- 🎯 AI CHECKPOINT A1: processLeadWithAI started for lead:', leadId);
      const lead = await strapi.entityService.findOne('api::lead.lead', leadId, {
        populate: ['campaign']
      });
      console.log('--- 🎯 AI CHECKPOINT A2: Lead fetched successfully');

      if (!lead) {
        throw new Error(`Lead ${leadId} not found`);
      }

      console.log('--- 🎯 AI CHECKPOINT A3: Updating processing status ---');
      // Update processing status
      await strapi.entityService.update('api::lead.lead', leadId, {
        data: { aiProcessingStatus: 'processing' }
      });
      console.log('--- 🎯 AI CHECKPOINT A4: Processing status updated ---');

      console.log('--- 🎯 AI CHECKPOINT A5: Calling generateAIResult ---');
      // Generate AI result
      const aiResult = await this.generateAIResult(lead, lead.campaign);
      console.log('--- 🎯 AI CHECKPOINT A6: AI result generated successfully ---');

      // Update lead with result
      await strapi.entityService.update('api::lead.lead', leadId, {
        data: {
          aiResult,
          aiProcessingStatus: 'completed'
        }
      });

      strapi.log.info(`🤖 AI processing completed for lead ${leadId}`);

      return {
        success: true,
        aiResult,
        leadId
      };

    } catch (error) {
      console.log('--- 🚨 AI PROCESSING ERROR - CRASH POINT IN AI PROCESSING ---');
      console.log('--- AI Error details:', error);
      console.log('--- AI Stack trace:', error.stack);
      strapi.log.error(`❌ AI processing failed for lead ${leadId}:`, error);
      
      // Update status to failed
      await strapi.entityService.update('api::lead.lead', leadId, {
        data: { aiProcessingStatus: 'failed' }
      });

      throw error;
    }
  },

  /**
   * Calculate job priority based on lead quality
   */
  calculateJobPriority(leadQuality) {
    switch (leadQuality) {
      case 'hot': return 1;     // Highest priority
      case 'warm': return 5;    // Medium priority  
      case 'cold': return 10;   // Lower priority
      default: return 15;       // Lowest priority
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
   * Generate AI result - Enhanced with real AI integration
   */
  async generateAIResult(lead, campaignData) {
    try {
      console.log('--- 🎯 AI CHECKPOINT B1: generateAIResult started ---');
      // Try real AI integration first
      console.log('--- 🎯 AI CHECKPOINT B2: Attempting real AI generation ---');
      const aiResult = await this.generateRealAIResult(lead, campaignData);
      if (aiResult) {
        console.log('--- 🎯 AI CHECKPOINT B3: Real AI generation successful ---');
        return aiResult;
      }
      
      console.log('--- 🎯 AI CHECKPOINT B4: Real AI failed, using template fallback ---');
      // Fallback to template-based result
      return this.generateTemplateResult(lead, campaignData);
      
    } catch (error) {
      console.log('--- 🚨 AI GENERATION ERROR ---');
      console.log('--- AI Generation Error details:', error);
      strapi.log.error('Error generating AI result:', error);
      console.log('--- 🎯 AI CHECKPOINT B5: Using template fallback after error ---');
      return this.generateTemplateResult(lead, campaignData);
    }
  },

  /**
   * Generate real AI result using AI provider service
   */
  async generateRealAIResult(lead, campaignData) {
    try {
      console.log('--- 🎯 AI CHECKPOINT C1: generateRealAIResult started ---');
      console.log('--- 🎯 AI CHECKPOINT C2: Loading AI provider service ---');
      const aiProviderService = require('../../../services/ai-provider.service');
      console.log('--- 🎯 AI CHECKPOINT C3: AI provider service loaded successfully ---');
      
      console.log('--- 🎯 AI CHECKPOINT C4: Checking AI service availability ---');
      if (!aiProviderService || !campaignData.aiPromptTemplate) {
        console.log('--- 🎯 AI CHECKPOINT C5: AI service or prompt template not available ---');
        console.log('--- AI Service available:', !!aiProviderService);
        console.log('--- Prompt template available:', !!campaignData.aiPromptTemplate);
        return null;
      }
      console.log('--- 🎯 AI CHECKPOINT C6: AI service and prompt template available ---');
      
      // Prepare AI context
      const aiContext = {
        firstName: lead.firstName,
        responses: lead.responses,
        leadScore: lead.leadScore,
        leadQuality: lead.leadQuality,
        campaignTitle: campaignData.title
      };
      
      console.log('--- 🎯 AI CHECKPOINT C7: Calling AI provider service ---');
      console.log('--- AI Context:', JSON.stringify(aiContext, null, 2));
      // Generate AI result
      const aiResult = await aiProviderService.generateContent(
        campaignData.aiPromptTemplate,
        aiContext,
        {
          provider: campaignData.aiProvider || 'auto',
          model: campaignData.aiModel || 'gpt-4o',
          temperature: campaignData.aiTemperature || 0.7,
          maxTokens: campaignData.aiMaxTokens || 1000
        }
      );
      console.log('--- 🎯 AI CHECKPOINT C8: AI provider service call completed ---');
      
      if (aiResult && aiResult.content) {
        strapi.log.info(`🤖 Real AI result generated for lead ${lead.id}`);
        return aiResult.content;
      }
      
      return null;
      
    } catch (error) {
      console.log('--- 🚨 REAL AI GENERATION ERROR - LIKELY CRASH POINT ---');
      console.log('--- Real AI Error details:', error);
      console.log('--- Real AI Stack trace:', error.stack);
      strapi.log.error('Real AI generation failed:', error);
      return null;
    }
  },

  /**
   * Generate template-based result (fallback)
   */
  generateTemplateResult(lead, campaignData) {
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
   * Send result email with enhanced template processing
   */
  async sendResultEmail(lead, campaignData, aiResult) {
    try {
      const emailService = require('../../../services/email.service');
      
      // Check if email is required for this campaign
      if (!this.shouldSendEmail(campaignData, lead)) {
        return { 
          success: false, 
          reason: 'Email sending not enabled for this campaign',
          skipReason: 'EMAIL_NOT_REQUIRED'
        };
      }
      
      // Check if lead has email address
      if (!lead.email) {
        return { 
          success: false, 
          reason: 'Lead has no email address',
          skipReason: 'NO_EMAIL_ADDRESS'
        };
      }
      
      // Check if email service is configured
      if (!emailService.isConfigured) {
        strapi.log.info('Email service not configured - skipping email send');
        return { 
          success: false, 
          reason: 'Email service not configured',
          skipReason: 'NO_EMAIL_CONFIG'
        };
      }
      
      // Get full campaign data
      const campaign = await strapi.entityService.findOne('api::campaign.campaign', campaignData.id);
      
      const emailResult = await emailService.sendResultEmail(lead, campaign, aiResult);
      
      if (emailResult.success) {
        strapi.log.info(`✅ Result email sent to ${lead.email}: ${emailResult.messageId}`);
        
        // Update lead with email sent status
        await strapi.entityService.update('api::lead.lead', lead.id, {
          data: {
            emailSent: true,
            emailSentAt: new Date()
          }
        });
      } else {
        strapi.log.warn(`⚠️ Failed to send result email to ${lead.email}: ${emailResult.reason || emailResult.error}`);
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
   * Check if email should be sent for this campaign
   */
  shouldSendEmail(campaignData, lead) {
    const deliveryMode = campaignData?.resultDeliveryMode || 'show_only';
    const resultConfig = campaignData?.resultDisplayConfig || {};
    
    // Check delivery mode
    if (deliveryMode === 'email_only' || deliveryMode === 'show_and_email') {
      return true;
    }
    
    // Check result config
    if (resultConfig.sendEmail === true) {
      return true;
    }
    
    // Check if email is required for high-quality leads
    if (lead.leadQuality === 'hot' && resultConfig.emailHotLeads !== false) {
      return true;
    }
    
    return false;
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