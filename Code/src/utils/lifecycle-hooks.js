/**
 * Lifecycle Hooks for GoAIX Platform
 * Handles automatic queue job creation and data processing
 */

'use strict';

/**
 * Setup comprehensive lifecycle hooks for campaigns and leads
 * @param {Object} strapi - Strapi instance
 */
function setupLifecycleHooks(strapi) {
  try {
    // Campaign lifecycle hooks
    strapi.db.lifecycles.subscribe({
      models: ['api::campaign.campaign'],
      
      async beforeCreate(event) {
        // Validate campaign configuration
        const { data } = event.params;
        const campaignService = strapi.service('api::campaign.campaign');
        
        if (campaignService.validateCampaignConfig) {
          const isValid = campaignService.validateCampaignConfig(data.config, data.campaignType);
          if (!isValid) {
            throw new Error('Invalid campaign configuration');
          }
        }

        // Initialize default values
        if (!data.currentLeadCount) {
          data.currentLeadCount = 0;
        }
        if (!data.tags) {
          data.tags = [];
        }
        if (!data.metadata) {
          data.metadata = {};
        }
      },

      async afterCreate(event) {
        const { result } = event;
        strapi.log.info(`📈 New campaign created: ${result.slug} (ID: ${result.id})`);

        // Auto-create Google Sheets if enabled
        if (process.env.AUTO_CREATE_SHEETS === 'true' && !result.googleSheetId) {
          try {
            const sheetsService = strapi.service('api::google-sheets.google-sheets');
            if (sheetsService) {
              await sheetsService.createSpreadsheetForCampaign(result);
              strapi.log.info(`📊 Auto-created Google Sheet for campaign: ${result.slug}`);
            }
          } catch (error) {
            strapi.log.warn(`⚠️ Failed to auto-create Google Sheet for campaign ${result.slug}:`, error.message);
          }
        }

        // Queue analytics tracking
        const queueService = strapi.service('api::queue.queue');
        if (queueService) {
          await queueService.addAnalyticsJob({
            event: 'campaign_created',
            data: {
              campaignId: result.id,
              campaignSlug: result.slug,
              campaignType: result.campaignType,
            },
          });
        }
      },

      async afterUpdate(event) {
        const { result, params } = event;
        strapi.log.info(`📝 Campaign updated: ${result.slug} (ID: ${result.id})`);

        // Check if Google Sheets configuration changed
        if (params.data.googleSheetId && params.data.googleSheetId !== result.googleSheetId) {
          strapi.log.info(`📊 Google Sheets configuration updated for campaign: ${result.slug}`);
          
          // Queue existing leads for export to new sheet
          const queueService = strapi.service('api::queue.queue');
          if (queueService) {
            const leads = await strapi.entityService.findMany('api::lead.lead', {
              filters: { campaign: result.id },
              fields: ['id'],
            });

            for (const lead of leads) {
              await queueService.addSheetsExportJob({
                leadId: lead.id,
                campaignId: result.id,
              }, { delay: Math.random() * 5000 }); // Stagger exports
            }
          }
        }

        // Track significant updates
        const significantFields = ['isActive', 'isPublic', 'maxLeads', 'endDate'];
        const hasSignificantUpdate = significantFields.some(field => params.data.hasOwnProperty(field));
        
        if (hasSignificantUpdate) {
          const queueService = strapi.service('api::queue.queue');
          if (queueService) {
            await queueService.addAnalyticsJob({
              event: 'campaign_updated',
              data: {
                campaignId: result.id,
                campaignSlug: result.slug,
                updatedFields: Object.keys(params.data),
              },
            });
          }
        }
      },

      async beforeDelete(event) {
        const { params } = event;
        const campaign = await strapi.entityService.findOne('api::campaign.campaign', params.where.id);
        
        if (campaign) {
          strapi.log.info(`🗑️ Campaign being deleted: ${campaign.slug} (ID: ${campaign.id})`);
          
          // Archive associated leads instead of deleting
          await strapi.db.query('api::lead.lead').updateMany({
            where: { campaign: campaign.id },
            data: { 
              archived: true,
              archivedAt: new Date(),
              archivedReason: 'Campaign deleted',
            },
          });
        }
      },
    });

    // Lead lifecycle hooks
    strapi.db.lifecycles.subscribe({
      models: ['api::lead.lead'],
      
      async beforeCreate(event) {
        const { data } = event.params;
        
        // Set default values
        if (!data.leadScore) {
          data.leadScore = 0;
        }
        if (!data.leadQuality) {
          data.leadQuality = 'warm';
        }
        if (!data.aiProcessingStatus) {
          data.aiProcessingStatus = 'pending';
        }
        if (!data.retryCount) {
          data.retryCount = 0;
        }
        if (!data.maxRetries) {
          data.maxRetries = 3;
        }
        if (!data.processingErrors) {
          data.processingErrors = [];
        }
        if (!data.tags) {
          data.tags = [];
        }
        if (!data.customFields) {
          data.customFields = {};
        }
      },

      async afterCreate(event) {
        const { result } = event;
        strapi.log.info(`👤 New lead created: ${result.id} for campaign: ${result.campaign}`);
        
        try {
          // Get campaign info for processing decisions
          const campaign = await strapi.entityService.findOne('api::campaign.campaign', result.campaign, {
            fields: ['id', 'slug', 'googleSheetId', 'aiProvider', 'emailTemplate', 'currentLeadCount'],
          });

          if (!campaign) {
            strapi.log.error(`❌ Campaign ${result.campaign} not found for lead ${result.id}`);
            return;
          }

          const queueService = strapi.service('api::queue.queue');
          if (!queueService) {
            strapi.log.error('❌ Queue service not available');
            return;
          }

          // Queue AI processing with priority based on lead quality
          const priority = getProcessingPriority(result.leadQuality);
          await queueService.addAIProcessingJob({
            leadId: result.id,
            campaignId: result.campaign,
          }, { priority });

          // Queue Google Sheets export if campaign has sheet configured
          if (campaign.googleSheetId) {
            await queueService.addSheetsExportJob({
              leadId: result.id,
              campaignId: result.campaign,
            }, { delay: 3000 }); // Delay to allow AI processing to start
          }

          // Queue analytics tracking
          await queueService.addAnalyticsJob({
            event: 'lead_created',
            data: {
              leadId: result.id,
              campaignId: result.campaign,
              campaignSlug: campaign.slug,
              leadScore: result.leadScore,
              leadQuality: result.leadQuality,
              hasConsentGiven: result.consentGiven,
              marketingOptIn: result.marketingOptIn,
            },
          });

          // Update campaign lead count
          await strapi.entityService.update('api::campaign.campaign', result.campaign, {
            data: {
              currentLeadCount: (campaign.currentLeadCount || 0) + 1,
            },
          });

        } catch (error) {
          strapi.log.error(`❌ Error processing new lead ${result.id}:`, error);
          
          // Update lead with error status
          await strapi.entityService.update('api::lead.lead', result.id, {
            data: {
              aiProcessingStatus: 'failed',
              processingErrors: [
                {
                  timestamp: new Date(),
                  error: error.message,
                  context: 'afterCreate_lifecycle',
                },
              ],
            },
          });
        }
      },

      async afterUpdate(event) {
        const { result, params } = event;
        
        try {
          const queueService = strapi.service('api::queue.queue');
          
          // Handle AI processing status changes
          if (params.data.aiProcessingStatus) {
            const oldStatus = params.data._previousStatus || 'unknown';
            const newStatus = result.aiProcessingStatus;
            
            strapi.log.info(`🔄 Lead ${result.id} processing status: ${oldStatus} → ${newStatus}`);

            // Send email if AI processing completed successfully
            if (newStatus === 'completed' && result.aiResult && !result.emailSent) {
              try {
                if (queueService) {
                  await queueService.addEmailJob({
                    leadId: result.id,
                    type: 'result-notification',
                  }, { delay: 5000 }); // Small delay to ensure everything is saved
                }
              } catch (error) {
                strapi.log.warn(`⚠️ Failed to queue result email for lead ${result.id}:`, error.message);
              }
            }

            // Handle failed processing
            if (newStatus === 'failed' && result.retryCount < result.maxRetries) {
              strapi.log.info(`🔄 Scheduling retry for lead ${result.id} (attempt ${result.retryCount + 1})`);
              
              // Queue retry with exponential backoff
              const retryDelay = Math.pow(2, result.retryCount) * 30000; // 30s, 1m, 2m, 4m...
              if (queueService) {
                await queueService.addAIProcessingJob({
                  leadId: result.id,
                  campaignId: result.campaign,
                }, { 
                  delay: retryDelay,
                  priority: 'high',
                  retry: true,
                });
              }
            }

            // Track processing status changes
            if (queueService) {
              await queueService.addAnalyticsJob({
                event: 'lead_processing_status_changed',
                data: {
                  leadId: result.id,
                  campaignId: result.campaign,
                  oldStatus,
                  newStatus,
                  retryCount: result.retryCount,
                },
              });
            }
          }

          // Handle Google Sheets export status changes
          if (params.data.googleSheetsExported === true && !result.googleSheetsExported) {
            strapi.log.info(`📊 Lead ${result.id} exported to Google Sheets`);
          }

          // Handle email sending status changes
          if (params.data.emailSent === true && !result.emailSent) {
            strapi.log.info(`📧 Result email sent for lead ${result.id}`);
            
            // Track email success
            if (queueService) {
              await queueService.addAnalyticsJob({
                event: 'lead_email_sent',
                data: {
                  leadId: result.id,
                  campaignId: result.campaign,
                },
              });
            }
          }

        } catch (error) {
          strapi.log.error(`❌ Error in lead afterUpdate hook for lead ${result.id}:`, error);
        }
      },

      async beforeDelete(event) {
        const { params } = event;
        const lead = await strapi.entityService.findOne('api::lead.lead', params.where.id);
        
        if (lead) {
          strapi.log.info(`🗑️ Lead being deleted: ${lead.id} (Email: ${lead.email})`);
          
          // Track lead deletion
          const queueService = strapi.service('api::queue.queue');
          if (queueService) {
            await queueService.addAnalyticsJob({
              event: 'lead_deleted',
              data: {
                leadId: lead.id,
                campaignId: lead.campaign,
                reason: 'manual_deletion',
              },
            });
          }
        }
      },
    });

    strapi.log.info('🔗 Enhanced lifecycle hooks configured successfully');

  } catch (error) {
    strapi.log.error('❌ Lifecycle hooks setup failed:', error);
    throw error;
  }
}

/**
 * Get processing priority based on lead quality
 * @param {string} leadQuality - Lead quality rating
 * @returns {string} Priority level
 */
function getProcessingPriority(leadQuality) {
  switch (leadQuality) {
    case 'hot':
      return 'high';
    case 'warm':
      return 'normal';
    case 'cold':
      return 'low';
    case 'unqualified':
      return 'low';
    default:
      return 'normal';
  }
}

module.exports = {
  setupLifecycleHooks,
  getProcessingPriority,
};