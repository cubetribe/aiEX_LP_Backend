/**
 * Google Sheets Service
 * Handles Google Sheets API integration for lead export
 * GoAIX Platform - quiz.goaiex.com
 */

'use strict';

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs').promises;

/**
 * Google Sheets Service for lead export and spreadsheet management
 */
class GoogleSheetsService {
  constructor(strapi) {
    this.strapi = strapi;
    this.sheets = null;
    this.auth = null;
    this.isInitialized = false;
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Initialize Google Sheets service with Service Account authentication
   */
  async initialize() {
    try {
      this.strapi.log.info('🔐 Initializing Google Sheets service...');

      // Load service account credentials
      const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
      const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

      let credentials;

      if (serviceAccountJson) {
        // Parse JSON string from environment variable
        credentials = JSON.parse(serviceAccountJson);
        this.strapi.log.info('✅ Using service account from environment variable');
      } else if (serviceAccountPath) {
        // Load from file path
        const credentialsPath = path.resolve(serviceAccountPath);
        const credentialsFile = await fs.readFile(credentialsPath, 'utf8');
        credentials = JSON.parse(credentialsFile);
        this.strapi.log.info(`✅ Using service account from file: ${serviceAccountPath}`);
      } else {
        throw new Error('No Google service account credentials found. Set GOOGLE_SERVICE_ACCOUNT_PATH or GOOGLE_SERVICE_ACCOUNT_JSON');
      }

      // Create JWT authentication
      this.auth = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.file',
        ]
      );

      // Initialize Sheets API
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });

      // Test authentication
      await this.testAuthentication();

      this.isInitialized = true;
      this.strapi.log.info('🎉 Google Sheets service initialized successfully');

    } catch (error) {
      this.strapi.log.error('❌ Failed to initialize Google Sheets service:', error);
      throw new Error(`Google Sheets initialization failed: ${error.message}`);
    }
  }

  /**
   * Test Google Sheets authentication
   */
  async testAuthentication() {
    try {
      // Create a test spreadsheet to verify permissions
      const testSheet = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: 'GoAIX Auth Test - ' + new Date().toISOString(),
          },
        },
      });

      // Delete the test spreadsheet
      const drive = google.drive({ version: 'v3', auth: this.auth });
      await drive.files.delete({
        fileId: testSheet.data.spreadsheetId,
      });

      this.strapi.log.info('✅ Google Sheets authentication test passed');
    } catch (error) {
      throw new Error(`Authentication test failed: ${error.message}`);
    }
  }

  /**
   * Create a new spreadsheet for campaign
   * @param {Object} campaign - Campaign object
   * @returns {Object} Spreadsheet creation result
   */
  async createSpreadsheetForCampaign(campaign) {
    try {
      this.ensureInitialized();

      const spreadsheetTitle = `GoAIX - ${campaign.title} - ${new Date().toISOString().split('T')[0]}`;

      this.strapi.log.info(`📊 Creating spreadsheet for campaign: ${campaign.slug}`);

      const spreadsheet = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: spreadsheetTitle,
            locale: 'de_DE',
            timeZone: 'Europe/Berlin',
          },
          sheets: [
            {
              properties: {
                title: 'Leads',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 26,
                  frozenRowCount: 1, // Freeze header row
                },
              },
            },
            {
              properties: {
                title: 'Summary',
                gridProperties: {
                  rowCount: 100,
                  columnCount: 10,
                },
              },
            },
          ],
        },
      });

      const spreadsheetId = spreadsheet.data.spreadsheetId;
      const spreadsheetUrl = spreadsheet.data.spreadsheetUrl;

      // Create headers based on campaign configuration
      await this.createHeaders(spreadsheetId, campaign);

      // Create summary sheet
      await this.createSummarySheet(spreadsheetId, campaign);

      // Update campaign with Google Sheet ID
      await this.strapi.entityService.update('api::campaign.campaign', campaign.id, {
        data: {
          googleSheetId: spreadsheetId,
          metadata: {
            ...campaign.metadata,
            googleSheetUrl: spreadsheetUrl,
            googleSheetCreatedAt: new Date().toISOString(),
          },
        },
      });

      this.strapi.log.info(`✅ Spreadsheet created successfully: ${spreadsheetId}`);

      return {
        spreadsheetId,
        spreadsheetUrl,
        title: spreadsheetTitle,
      };

    } catch (error) {
      this.strapi.log.error('❌ Failed to create spreadsheet:', error);
      throw new Error(`Spreadsheet creation failed: ${error.message}`);
    }
  }

  /**
   * Create headers in the spreadsheet based on campaign configuration
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {Object} campaign - Campaign object
   */
  async createHeaders(spreadsheetId, campaign) {
    try {
      // Base headers that are always included
      const baseHeaders = [
        'Timestamp',
        'Lead ID',
        'First Name',
        'Last Name',
        'Email',
        'Phone',
        'Company',
        'Job Title',
        'Lead Score',
        'Lead Quality',
        'Processing Status',
        'AI Result Preview',
        'Email Sent',
        'UTM Source',
        'UTM Medium',
        'UTM Campaign',
        'IP Address',
        'User Agent',
        'Referrer',
      ];

      // Dynamic headers based on campaign type and configuration
      const dynamicHeaders = this.generateDynamicHeaders(campaign);

      // Combine all headers
      const allHeaders = [...baseHeaders, ...dynamicHeaders];

      // Apply headers to spreadsheet
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Leads!A1:Z1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [allHeaders],
        },
      });

      // Format header row
      await this.formatHeaderRow(spreadsheetId, allHeaders.length);

      this.strapi.log.info(`📝 Created ${allHeaders.length} headers for campaign: ${campaign.slug}`);

    } catch (error) {
      this.strapi.log.error('❌ Failed to create headers:', error);
      throw error;
    }
  }

  /**
   * Generate dynamic headers based on campaign configuration
   * @param {Object} campaign - Campaign object
   * @returns {Array} Dynamic headers
   */
  generateDynamicHeaders(campaign) {
    const dynamicHeaders = [];

    try {
      const config = campaign.config || {};

      switch (campaign.campaignType) {
        case 'quiz':
          if (config.questions && Array.isArray(config.questions)) {
            config.questions.forEach(question => {
              dynamicHeaders.push(`Q: ${question.question}`);
            });
          }
          break;

        case 'chatbot':
          dynamicHeaders.push('Conversation Summary');
          dynamicHeaders.push('Message Count');
          break;

        case 'imageUpload':
          dynamicHeaders.push('Image URL');
          dynamicHeaders.push('Image Analysis');
          break;

        case 'textOnly':
          if (config.fields && Array.isArray(config.fields)) {
            config.fields.forEach(field => {
              dynamicHeaders.push(field.label || field.name);
            });
          }
          break;

        case 'custom':
          if (config.customFields && Array.isArray(config.customFields)) {
            config.customFields.forEach(field => {
              dynamicHeaders.push(field.label || field.name);
            });
          }
          break;
      }

      // Add custom fields from campaign metadata
      if (config.additionalFields && Array.isArray(config.additionalFields)) {
        config.additionalFields.forEach(field => {
          dynamicHeaders.push(field.label || field.name);
        });
      }

    } catch (error) {
      this.strapi.log.warn('⚠️ Error generating dynamic headers:', error);
    }

    return dynamicHeaders;
  }

  /**
   * Format header row with styling
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {number} columnCount - Number of columns
   */
  async formatHeaderRow(spreadsheetId, columnCount) {
    try {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: 0,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: columnCount,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: {
                      red: 0.2,
                      green: 0.6,
                      blue: 0.9,
                    },
                    textFormat: {
                      foregroundColor: {
                        red: 1.0,
                        green: 1.0,
                        blue: 1.0,
                      },
                      bold: true,
                    },
                    horizontalAlignment: 'CENTER',
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
              },
            },
          ],
        },
      });
    } catch (error) {
      this.strapi.log.warn('⚠️ Failed to format header row:', error);
    }
  }

  /**
   * Create summary sheet with campaign statistics
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {Object} campaign - Campaign object
   */
  async createSummarySheet(spreadsheetId, campaign) {
    try {
      const summaryData = [
        ['Campaign Summary', ''],
        ['Campaign Name', campaign.title],
        ['Campaign Type', campaign.campaignType],
        ['Campaign Slug', campaign.slug],
        ['Created Date', new Date(campaign.createdAt).toLocaleDateString('de-DE')],
        ['', ''],
        ['Statistics', ''],
        ['Total Leads', '=COUNTA(Leads!B:B)-1'],
        ['Processing Complete', '=COUNTIF(Leads!K:K,"completed")'],
        ['Emails Sent', '=COUNTIF(Leads!M:M,"TRUE")'],
        ['Average Lead Score', '=AVERAGE(Leads!I:I)'],
        ['', ''],
        ['Lead Quality Distribution', ''],
        ['Hot Leads', '=COUNTIF(Leads!J:J,"hot")'],
        ['Warm Leads', '=COUNTIF(Leads!J:J,"warm")'],
        ['Cold Leads', '=COUNTIF(Leads!J:J,"cold")'],
        ['Unqualified', '=COUNTIF(Leads!J:J,"unqualified")'],
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Summary!A1:B20',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: summaryData,
        },
      });

      this.strapi.log.info('📈 Summary sheet created successfully');

    } catch (error) {
      this.strapi.log.warn('⚠️ Failed to create summary sheet:', error);
    }
  }

  /**
   * Export lead to Google Sheets
   * @param {Object} lead - Lead object with populated campaign
   * @returns {Object} Export result
   */
  async exportLead(lead) {
    try {
      this.ensureInitialized();

      if (!lead.campaign) {
        throw new Error('Lead must have populated campaign data');
      }

      if (!lead.campaign.googleSheetId) {
        throw new Error('Campaign does not have a Google Sheet configured');
      }

      this.strapi.log.info(`📤 Exporting lead ${lead.id} to Google Sheets`);

      // Prepare lead data for export
      const leadData = this.prepareLeadData(lead);

      // Find next available row
      const nextRow = await this.findNextAvailableRow(lead.campaign.googleSheetId);

      // Insert lead data
      const result = await this.sheets.spreadsheets.values.update({
        spreadsheetId: lead.campaign.googleSheetId,
        range: `Leads!A${nextRow}:Z${nextRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [leadData],
        },
      });

      // Update lead with export information
      await this.strapi.entityService.update('api::lead.lead', lead.id, {
        data: {
          googleSheetsExported: true,
          googleSheetsExportedAt: new Date(),
          googleSheetsRowNumber: nextRow,
        },
      });

      this.strapi.log.info(`✅ Lead ${lead.id} exported to row ${nextRow}`);

      return {
        success: true,
        rowNumber: nextRow,
        spreadsheetId: lead.campaign.googleSheetId,
        updatedCells: result.data.updatedCells,
      };

    } catch (error) {
      this.strapi.log.error(`❌ Failed to export lead ${lead.id}:`, error);
      
      // Update lead with export error
      await this.strapi.entityService.update('api::lead.lead', lead.id, {
        data: {
          googleSheetsExported: false,
          processingErrors: [
            ...(lead.processingErrors || []),
            {
              timestamp: new Date(),
              type: 'google_sheets_export',
              error: error.message,
            },
          ],
        },
      });

      throw error;
    }
  }

  /**
   * Prepare lead data for Google Sheets export
   * @param {Object} lead - Lead object
   * @returns {Array} Formatted lead data array
   */
  prepareLeadData(lead) {
    try {
      const baseData = [
        new Date(lead.createdAt).toLocaleString('de-DE'),
        lead.id,
        lead.firstName || '',
        lead.lastName || '',
        lead.email || '',
        lead.phone || '',
        lead.company || '',
        lead.jobTitle || '',
        lead.leadScore || 0,
        lead.leadQuality || '',
        lead.aiProcessingStatus || '',
        this.truncateText(lead.aiResult, 100) || '',
        lead.emailSent ? 'TRUE' : 'FALSE',
        lead.utmSource || '',
        lead.utmMedium || '',
        lead.utmCampaign || '',
        lead.ipAddress || '',
        this.truncateText(lead.userAgent, 50) || '',
        lead.referrer || '',
      ];

      // Add dynamic data based on campaign type and responses
      const dynamicData = this.prepareDynamicData(lead);

      return [...baseData, ...dynamicData];

    } catch (error) {
      this.strapi.log.error('❌ Error preparing lead data:', error);
      return [];
    }
  }

  /**
   * Prepare dynamic data based on lead responses
   * @param {Object} lead - Lead object
   * @returns {Array} Dynamic data array
   */
  prepareDynamicData(lead) {
    const dynamicData = [];

    try {
      const responses = lead.responses || {};
      const campaign = lead.campaign;
      const config = campaign.config || {};

      switch (campaign.campaignType) {
        case 'quiz':
          if (config.questions && Array.isArray(config.questions)) {
            config.questions.forEach(question => {
              const answer = responses[question.id] || '';
              dynamicData.push(String(answer));
            });
          }
          break;

        case 'chatbot':
          dynamicData.push(responses.conversationSummary || '');
          dynamicData.push(responses.messageCount || 0);
          break;

        case 'imageUpload':
          dynamicData.push(responses.imageUrl || '');
          dynamicData.push(responses.imageAnalysis || '');
          break;

        case 'textOnly':
          if (config.fields && Array.isArray(config.fields)) {
            config.fields.forEach(field => {
              const value = responses[field.name] || '';
              dynamicData.push(String(value));
            });
          }
          break;

        case 'custom':
          if (config.customFields && Array.isArray(config.customFields)) {
            config.customFields.forEach(field => {
              const value = responses[field.name] || '';
              dynamicData.push(String(value));
            });
          }
          break;
      }

      // Add additional custom fields
      if (lead.customFields) {
        Object.values(lead.customFields).forEach(value => {
          dynamicData.push(String(value || ''));
        });
      }

    } catch (error) {
      this.strapi.log.warn('⚠️ Error preparing dynamic data:', error);
    }

    return dynamicData;
  }

  /**
   * Find next available row in spreadsheet
   * @param {string} spreadsheetId - Spreadsheet ID
   * @returns {number} Next available row number
   */
  async findNextAvailableRow(spreadsheetId) {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Leads!A:A',
      });

      const values = response.data.values || [];
      return values.length + 1;

    } catch (error) {
      this.strapi.log.warn('⚠️ Error finding next row, defaulting to row 2:', error);
      return 2; // Default to row 2 (after header)
    }
  }

  /**
   * Batch export multiple leads
   * @param {Array} leads - Array of lead objects
   * @returns {Object} Batch export result
   */
  async batchExportLeads(leads) {
    try {
      this.ensureInitialized();

      if (!leads || leads.length === 0) {
        return { success: true, exported: 0, errors: [] };
      }

      this.strapi.log.info(`📦 Starting batch export of ${leads.length} leads`);

      const results = {
        success: true,
        exported: 0,
        errors: [],
        details: [],
      };

      // Group leads by spreadsheet
      const leadsBySpreadsheet = new Map();
      leads.forEach(lead => {
        if (lead.campaign && lead.campaign.googleSheetId) {
          const sheetId = lead.campaign.googleSheetId;
          if (!leadsBySpreadsheet.has(sheetId)) {
            leadsBySpreadsheet.set(sheetId, []);
          }
          leadsBySpreadsheet.get(sheetId).push(lead);
        }
      });

      // Process each spreadsheet
      for (const [spreadsheetId, sheetLeads] of leadsBySpreadsheet) {
        try {
          await this.batchExportToSpreadsheet(spreadsheetId, sheetLeads);
          results.exported += sheetLeads.length;
          
          // Update all leads as exported
          for (const lead of sheetLeads) {
            await this.strapi.entityService.update('api::lead.lead', lead.id, {
              data: {
                googleSheetsExported: true,
                googleSheetsExportedAt: new Date(),
              },
            });
          }

        } catch (error) {
          results.errors.push({
            spreadsheetId,
            leadIds: sheetLeads.map(l => l.id),
            error: error.message,
          });
          results.success = false;
        }
      }

      this.strapi.log.info(`✅ Batch export completed: ${results.exported} exported, ${results.errors.length} errors`);

      return results;

    } catch (error) {
      this.strapi.log.error('❌ Batch export failed:', error);
      throw error;
    }
  }

  /**
   * Batch export leads to a specific spreadsheet
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {Array} leads - Array of leads for this spreadsheet
   */
  async batchExportToSpreadsheet(spreadsheetId, leads) {
    try {
      // Find starting row
      const startRow = await this.findNextAvailableRow(spreadsheetId);
      
      // Prepare all lead data
      const allLeadData = leads.map(lead => this.prepareLeadData(lead));
      
      // Calculate range
      const endRow = startRow + leads.length - 1;
      const range = `Leads!A${startRow}:Z${endRow}`;

      // Batch update
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: allLeadData,
        },
      });

      this.strapi.log.info(`✅ Batch exported ${leads.length} leads to ${spreadsheetId}`);

    } catch (error) {
      this.strapi.log.error(`❌ Batch export to ${spreadsheetId} failed:`, error);
      throw error;
    }
  }

  /**
   * Retry operation with exponential backoff
   * @param {Function} operation - Operation to retry
   * @param {number} maxAttempts - Maximum retry attempts
   * @returns {any} Operation result
   */
  async retryOperation(operation, maxAttempts = this.retryAttempts) {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          break;
        }

        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        this.strapi.log.warn(`⚠️ Attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} Whether error is retryable
   */
  isRetryableError(error) {
    const retryableCodes = [429, 500, 502, 503, 504];
    const retryableMessages = [
      'timeout',
      'network',
      'rate limit',
      'quota exceeded',
      'temporarily unavailable',
    ];

    // Check HTTP status codes
    if (error.code && retryableCodes.includes(error.code)) {
      return true;
    }

    // Check error messages
    const errorMessage = error.message.toLowerCase();
    return retryableMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Ensure service is initialized
   */
  ensureInitialized() {
    if (!this.isInitialized) {
      throw new Error('Google Sheets service is not initialized. Call initialize() first.');
    }
  }

  /**
   * Truncate text to specified length
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated text
   */
  truncateText(text, maxLength) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  /**
   * Get spreadsheet information
   * @param {string} spreadsheetId - Spreadsheet ID
   * @returns {Object} Spreadsheet information
   */
  async getSpreadsheetInfo(spreadsheetId) {
    try {
      this.ensureInitialized();

      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
      });

      return {
        id: response.data.spreadsheetId,
        title: response.data.properties.title,
        url: response.data.spreadsheetUrl,
        sheets: response.data.sheets.map(sheet => ({
          id: sheet.properties.sheetId,
          title: sheet.properties.title,
          rowCount: sheet.properties.gridProperties.rowCount,
          columnCount: sheet.properties.gridProperties.columnCount,
        })),
      };

    } catch (error) {
      this.strapi.log.error('❌ Failed to get spreadsheet info:', error);
      throw error;
    }
  }
}

module.exports = GoogleSheetsService;