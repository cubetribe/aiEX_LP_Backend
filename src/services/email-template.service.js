'use strict';

/**
 * Email Template Service
 * Advanced email template processing and campaign integration
 */

class EmailTemplateService {
  constructor() {
    this.defaultTemplates = {
      subject: {
        hot: '🔥 Ihr Premium-Ergebnis von {{campaignTitle}} - Exklusive Empfehlungen!',
        warm: '⭐ Ihr personalisiertes Ergebnis von {{campaignTitle}}',
        cold: '💡 Ihr Ergebnis von {{campaignTitle}} - Erste Schritte',
        default: 'Ihr Ergebnis von {{campaignTitle}}'
      },
      body: {
        hot: `Hallo {{firstName}},

🔥 **Herzlichen Glückwunsch!** Sie haben {{leadScore}}/100 Punkte erreicht!

Sie sind ein Premium-Lead mit außergewöhnlichem Potenzial. Basierend auf Ihren Antworten haben wir exklusive Empfehlungen für Sie:

{{aiResult}}

🚀 **Nächste Schritte für Premium-Leads:**
• Direkter Zugang zu unserem Experten-Team
• Kostenlose Erstberatung binnen 24h
• Individuelle Lösungsempfehlung

Beste Grüße,
Ihr GoAIX Team`,

        warm: `Hallo {{firstName}},

⭐ Vielen Dank für Ihre Teilnahme an {{campaignTitle}}!

Sie haben {{leadScore}}/100 Punkte erreicht. Ihre Antworten zeigen klares Interesse an unseren Lösungen:

{{aiResult}}

📞 **Empfohlene nächste Schritte:**
• Laden Sie unseren kostenlosen Leitfaden herunter
• Buchen Sie ein unverbindliches Beratungsgespräch
• Erhalten Sie maßgeschneiderte Empfehlungen

Beste Grüße,
Ihr GoAIX Team`,

        cold: `Hallo {{firstName}},

💡 Vielen Dank für Ihre Teilnahme an {{campaignTitle}}!

Mit {{leadScore}}/100 Punkten stehen Sie noch am Anfang. Hier sind unsere Empfehlungen für Ihren Einstieg:

{{aiResult}}

🎯 **Erste Schritte:**
• Informieren Sie sich über unsere Basis-Angebote
• Nutzen Sie unsere kostenlosen Ressourcen
• Bleiben Sie über Newsletter informiert

Beste Grüße,
Ihr GoAIX Team`,

        default: `Hallo {{firstName}},

Vielen Dank für Ihre Teilnahme an {{campaignTitle}}!

{{aiResult}}

Bei Fragen stehen wir gerne zur Verfügung.

Beste Grüße,
Ihr GoAIX Team`
      }
    };
  }

  /**
   * Get email template based on lead quality and campaign
   */
  getTemplate(campaign, lead, type = 'body') {
    const leadQuality = lead.leadQuality || 'default';
    
    // Use campaign-specific template if available
    if (type === 'subject' && campaign.emailSubject) {
      return campaign.emailSubject;
    }
    
    if (type === 'body' && campaign.emailTemplate) {
      return campaign.emailTemplate;
    }
    
    // Use quality-specific default template
    const templates = this.defaultTemplates[type];
    return templates[leadQuality] || templates.default;
  }

  /**
   * Process template variables
   */
  processTemplate(template, variables) {
    let processed = template;
    
    // Replace {{variable}} patterns
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      processed = processed.replace(regex, variables[key] || '');
    });
    
    return processed;
  }

  /**
   * Generate complete email content
   */
  generateEmailContent(campaign, lead, aiResult) {
    // Prepare template variables
    const variables = {
      firstName: lead.firstName,
      email: lead.email,
      campaignTitle: campaign.title,
      aiResult: aiResult,
      leadScore: lead.leadScore,
      leadQuality: lead.leadQuality,
      responses: this.formatResponses(lead.responses),
      previewUrl: campaign.previewUrl,
      currentDate: new Date().toLocaleDateString('de-DE'),
      currentTime: new Date().toLocaleTimeString('de-DE')
    };

    // Generate subject and body
    const subject = this.processTemplate(
      this.getTemplate(campaign, lead, 'subject'),
      variables
    );

    const body = this.processTemplate(
      this.getTemplate(campaign, lead, 'body'),
      variables
    );

    return {
      subject,
      body,
      variables
    };
  }

  /**
   * Format responses for email display
   */
  formatResponses(responses) {
    if (!responses || typeof responses !== 'object') {
      return 'Keine Antworten verfügbar';
    }

    return Object.entries(responses)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  }

  /**
   * Generate HTML email body with styling
   */
  generateHTMLBody(campaign, lead, aiResult) {
    const { body, variables } = this.generateEmailContent(campaign, lead, aiResult);
    
    const leadQualityColors = {
      hot: '#ff4757',
      warm: '#ffa502', 
      cold: '#3742fa',
      default: '#2f3542'
    };

    const qualityColor = leadQualityColors[lead.leadQuality] || leadQualityColors.default;

    return `
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${campaign.title} - Ergebnis</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
          }
          .container {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, ${qualityColor} 0%, #667eea 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .score-badge {
            background: rgba(255,255,255,0.2);
            padding: 8px 16px;
            border-radius: 20px;
            display: inline-block;
            margin-top: 10px;
            font-weight: bold;
          }
          .content {
            padding: 30px 20px;
          }
          .result-box {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid ${qualityColor};
          }
          .cta-section {
            background: #e3f2fd;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #e1e5e9;
          }
          .quality-${lead.leadQuality} {
            border-left-color: ${qualityColor};
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 ${campaign.title}</h1>
            <div class="score-badge">Score: ${lead.leadScore}/100 • ${lead.leadQuality.toUpperCase()}</div>
          </div>
          <div class="content">
            <div class="result-box quality-${lead.leadQuality}">
              ${body.replace(/\n/g, '<br>')}
            </div>
          </div>
          <div class="footer">
            <p>© 2025 GoAIX - AI-Lead-Magnet-Platform</p>
            <p>Diese E-Mail wurde automatisch am ${variables.currentDate} um ${variables.currentTime} generiert.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get email configuration for campaign
   */
  getEmailConfig(campaign) {
    const resultConfig = campaign.resultDisplayConfig || {};
    
    return {
      enabled: this.isEmailEnabled(campaign),
      deliveryMode: campaign.resultDeliveryMode || 'show_only',
      requireEmail: campaign.requireEmailForResult || false,
      sendToWarmLeads: resultConfig.emailWarmLeads === true,
      sendToAllLeads: resultConfig.sendEmail === true
    };
  }

  /**
   * Check if email is enabled for campaign
   */
  isEmailEnabled(campaign) {
    const deliveryMode = campaign.resultDeliveryMode || 'show_only';
    return deliveryMode === 'email_only' || deliveryMode === 'show_and_email';
  }
}

// Create singleton instance
const emailTemplateService = new EmailTemplateService();

module.exports = emailTemplateService;