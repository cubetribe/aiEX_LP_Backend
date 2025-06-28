// Emergency route to fix campaign isActive status
module.exports = {
  method: 'POST',
  path: '/admin/fix-campaigns',
  handler: async (ctx) => {
    try {
      console.log('🔧 Fixing campaign isActive status...');
      
      // Update Campaign 1 (test-quiz2)
      const campaign1 = await strapi.entityService.update('api::campaign.campaign', 1, {
        data: {
          isActive: true,
          status: 'active'
        }
      });
      
      // Update Campaign 2 (test3)  
      const campaign2 = await strapi.entityService.update('api::campaign.campaign', 2, {
        data: {
          isActive: true,
          status: 'active'
        }
      });
      
      console.log('✅ Both campaigns updated successfully');
      
      ctx.body = {
        success: true,
        message: 'Campaigns fixed successfully',
        campaigns: [
          { id: 1, title: campaign1.title, isActive: campaign1.isActive },
          { id: 2, title: campaign2.title, isActive: campaign2.isActive }
        ]
      };
      
    } catch (error) {
      console.error('❌ Error fixing campaigns:', error);
      ctx.status = 500;
      ctx.body = { error: 'Failed to fix campaigns', details: error.message };
    }
  },
  config: {
    auth: false,
  },
};