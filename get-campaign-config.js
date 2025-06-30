const axios = require('axios');

// Get detailed campaign configuration
async function getCampaignConfig() {
  try {
    console.log('🔍 Getting Campaign ID 2 detailed configuration...\n');
    
    // First, make a direct API call to get campaign by slug
    const slugResponse = await axios.get('https://web-production-6df54.up.railway.app/campaigns/public/test2');
    
    if (slugResponse.data?.data) {
      const campaign = slugResponse.data.data;
      console.log('📋 Campaign Details from API:');
      console.log('- ID:', campaign.id);
      console.log('- Title:', campaign.title);
      console.log('- Slug:', campaign.slug);
      console.log('- Type:', campaign.campaignType);
      console.log('- Config:', JSON.stringify(campaign.config, null, 2));
      console.log('\n');
      
      // Check for missing required fields
      if (campaign.config) {
        console.log('🔍 Config Analysis:');
        console.log('- Has type field:', !!campaign.config.type);
        console.log('- Has title field:', !!campaign.config.title);
        console.log('- Has questions field:', !!campaign.config.questions);
        console.log('- Questions count:', campaign.config.questions?.length || 0);
        
        if (!campaign.config.title) {
          console.log('\n⚠️  WARNING: Config is missing required "title" field!');
          console.log('This is causing the validation error in the admin panel.');
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

getCampaignConfig();