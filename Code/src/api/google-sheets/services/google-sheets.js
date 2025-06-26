/**
 * Google Sheets Service - Strapi Service Wrapper
 * Wraps the Google Sheets service class for Strapi integration
 */

'use strict';

const GoogleSheetsService = require('../../../services/google-sheets.service');

module.exports = ({ strapi }) => {
  let sheetsServiceInstance = null;

  return {
    /**
     * Get or create Google Sheets service instance
     */
    getInstance() {
      if (!sheetsServiceInstance) {
        sheetsServiceInstance = new GoogleSheetsService(strapi);
      }
      return sheetsServiceInstance;
    },

    /**
     * Initialize Google Sheets service
     */
    async initialize() {
      const instance = this.getInstance();
      if (!instance.isInitialized) {
        await instance.initialize();
      }
      return instance;
    },

    /**
     * Create spreadsheet for campaign
     */
    async createSpreadsheetForCampaign(campaign) {
      const instance = this.getInstance();
      return instance.createSpreadsheetForCampaign(campaign);
    },

    /**
     * Export lead to Google Sheets
     */
    async exportLead(lead) {
      const instance = this.getInstance();
      return instance.exportLead(lead);
    },

    /**
     * Batch export multiple leads
     */
    async batchExportLeads(leads) {
      const instance = this.getInstance();
      return instance.batchExportLeads(leads);
    },

    /**
     * Get spreadsheet information
     */
    async getSpreadsheetInfo(spreadsheetId) {
      const instance = this.getInstance();
      return instance.getSpreadsheetInfo(spreadsheetId);
    },

    /**
     * Retry operation with exponential backoff
     */
    async retryOperation(operation, maxAttempts) {
      const instance = this.getInstance();
      return instance.retryOperation(operation, maxAttempts);
    },
  };
};