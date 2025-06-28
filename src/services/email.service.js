'use strict';

/**
 * Email Service
 * Handles email sending with multiple providers and templates
 */

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.init();
  }

  async init() {
    try {
      // Check environment configuration
      const emailConfig = this.getEmailConfig();
      
      if (!emailConfig.provider || emailConfig.provider === 'none') {
        strapi.log.info('Email service disabled - no provider configured');
        return;
      }

      // Create transporter based on provider
      this.transporter = await this.createTransporter(emailConfig);
      
      // Verify connection
      if (this.transporter) {
        await this.transporter.verify();
        this.isConfigured = true;
        strapi.log.info(`Email service initialized with ${emailConfig.provider}`);
      }
    } catch (error) {
      strapi.log.error('Email service initialization failed:', error);
      this.isConfigured = false;
    }
  }

  getEmailConfig() {
    // Support multiple email providers
    const provider = process.env.EMAIL_PROVIDER || 'none';
    
    const configs = {
      smtp: {
        provider: 'smtp',
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      },
      gmail: {
        provider: 'gmail',
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      },
      sendgrid: {
        provider: 'sendgrid',
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      },
      mailgun: {
        provider: 'mailgun',
        host: 'smtp.mailgun.org',
        port: 587,
        auth: {
          user: process.env.MAILGUN_SMTP_LOGIN,
          pass: process.env.MAILGUN_SMTP_PASSWORD
        }
      }
    };

    return configs[provider] || { provider: 'none' };
  }

  async createTransporter(config) {
    try {
      const transporter = nodemailer.createTransporter(config);
      return transporter;
    } catch (error) {
      strapi.log.error('Failed to create email transporter:', error);
      return null;
    }
  }

  /**
   * Send AI result email to lead
   */
  async sendResultEmail(lead, campaign, aiResult) {
    if (!this.isConfigured) {
      strapi.log.warn('Email service not configured - skipping email send');
      return { success: false, reason: 'Email service not configured' };
    }

    try {
      // Check if email sending is enabled for this campaign
      const resultConfig = campaign.resultDisplayConfig || {};
      if (!resultConfig.sendEmail && campaign.resultDeliveryMode !== 'email_only' && campaign.resultDeliveryMode !== 'show_and_email') {
        return { success: false, reason: 'Email sending disabled for this campaign' };
      }

      // Prepare email content
      const emailData = this.prepareEmailContent(lead, campaign, aiResult);
      
      // Send email
      const info = await this.transporter.sendMail(emailData);
      
      strapi.log.info(`Email sent successfully to ${lead.email}: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId,
        recipient: lead.email
      };
    } catch (error) {
      strapi.log.error('Failed to send result email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Prepare email content with template processing
   */
  prepareEmailContent(lead, campaign, aiResult) {
    // Process email template with variables
    const templateVars = {
      firstName: lead.firstName,
      email: lead.email,
      campaignTitle: campaign.title,
      aiResult: aiResult,
      leadScore: lead.leadScore,
      leadQuality: lead.leadQuality,
      responses: JSON.stringify(lead.responses, null, 2),
      previewUrl: campaign.previewUrl,
      currentDate: new Date().toLocaleDateString('de-DE'),
      currentTime: new Date().toLocaleTimeString('de-DE')
    };

    // Process subject and body templates
    const subject = this.processTemplate(campaign.emailSubject || 'Ihr Ergebnis von {{campaignTitle}}', templateVars);
    const htmlBody = this.processTemplate(campaign.emailTemplate || this.getDefaultEmailTemplate(), templateVars);
    
    // Convert to plain text for fallback
    const textBody = htmlBody.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n\n');

    return {
      from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@goaiex.com',
      to: lead.email,
      subject: subject,
      text: textBody,
      html: this.wrapInEmailHTML(htmlBody, campaign),
      // Add campaign and lead tracking
      headers: {
        'X-Campaign-ID': campaign.id,
        'X-Lead-ID': lead.id,
        'X-Lead-Quality': lead.leadQuality
      }
    };
  }

  /**
   * Process template variables in string
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
   * Get default email template
   */
  getDefaultEmailTemplate() {
    return `
      <h2>Hallo {{firstName}},</h2>
      
      <p>vielen Dank für Ihre Teilnahme an <strong>{{campaignTitle}}</strong>!</p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Ihr personalisiertes Ergebnis:</h3>
        <div style="white-space: pre-line;">{{aiResult}}</div>
      </div>
      
      <div style="margin: 20px 0; padding: 15px; background: #e3f2fd; border-radius: 6px;">
        <p><strong>Lead-Score:</strong> {{leadScore}}/100</p>
        <p><strong>Qualifikation:</strong> {{leadQuality}}</p>
      </div>
      
      <p>Beste Grüße<br>
      Ihr GoAIX Team</p>
      
      <hr style="margin: 30px 0;">
      <p style="font-size: 12px; color: #666;">
        Diese E-Mail wurde automatisch generiert am {{currentDate}} um {{currentTime}}.
      </p>
    `;
  }

  /**
   * Wrap email content in HTML template
   */
  wrapInEmailHTML(content, campaign) {
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
            background-color: #ffffff;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            border-radius: 8px 8px 0 0;
            text-align: center;
          }
          .content {
            padding: 30px 20px;
            border: 1px solid #e1e5e9;
            border-top: none;
            border-radius: 0 0 8px 8px;
          }
          .footer {
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #e1e5e9;
            margin-top: 20px;
          }
          h2, h3 {
            color: #2c3e50;
          }
          .result-box {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #667eea;
          }
          .score-box {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎯 ${campaign.title}</h1>
          <p>Ihr personalisiertes AI-Ergebnis</p>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>© 2025 GoAIX - AI-Lead-Magnet-Platform</p>
          <p>Diese E-Mail wurde automatisch generiert.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Test email configuration
   */
  async testEmailConfig() {
    if (!this.isConfigured) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const testEmail = {
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to: process.env.EMAIL_FROM || process.env.SMTP_USER,
        subject: 'GoAIX Email Service Test',
        text: 'This is a test email from GoAIX Email Service.',
        html: '<h2>GoAIX Email Service Test</h2><p>This is a test email from GoAIX Email Service.</p>'
      };

      const info = await this.transporter.sendMail(testEmail);
      
      return {
        success: true,
        messageId: info.messageId,
        message: 'Test email sent successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send test email with custom content
   */
  async sendTestEmail(to, subject, content) {
    if (!this.isConfigured) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const emailData = {
        from: process.env.SMTP_USERNAME || 'mail@goaiex.com',
        to,
        subject,
        text: content,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">GoAIX Test Email</h2>
            <p>${content}</p>
            <hr style="margin: 20px 0;">
            <p style="font-size: 12px; color: #666;">
              Test email sent from GoAIX Email Service
            </p>
          </div>
        `
      };

      const info = await this.transporter.sendMail(emailData);
      
      return {
        success: true,
        messageId: info.messageId,
        recipient: to,
        message: 'Test email sent successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get email service status
   */
  getStatus() {
    return {
      isConfigured: this.isConfigured,
      provider: this.getEmailConfig().provider,
      ready: this.transporter !== null
    };
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;