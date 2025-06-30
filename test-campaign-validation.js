const axios = require('axios');

// Test campaign validation endpoint
async function testCampaignValidation() {
  try {
    console.log('🔍 Testing Campaign ID 2 validation...\n');
    
    // First, get the current campaign data
    const campaignResponse = await axios.get('https://web-production-6df54.up.railway.app/debug/campaigns');
    const campaigns = campaignResponse.data?.data?.campaigns || [];
    const campaign2 = campaigns.find(c => c.id === 2);
    
    if (!campaign2) {
      console.log('❌ Campaign ID 2 not found');
      return;
    }
    
    console.log('📋 Campaign 2 Details:');
    console.log('- Title:', campaign2.title);
    console.log('- Type:', campaign2.campaignType);
    console.log('- Config Keys:', campaign2.configKeys);
    console.log('- Has Config:', campaign2.configValid);
    console.log('\n');
    
    // Test validation endpoint
    console.log('🧪 Testing validation endpoint...');
    try {
      const validationResponse = await axios.post(
        `https://web-production-6df54.up.railway.app/debug/campaign/2/validate`,
        {} // Empty body to use existing config
      );
      
      console.log('✅ Validation Response:');
      console.log(JSON.stringify(validationResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Validation Failed:');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data);
    }
    
    // Test with a partial update (like admin panel would send)
    console.log('\n🧪 Testing partial update validation...');
    const partialConfig = {
      styling: {
        primaryColor: '#ff0000'
      }
    };
    
    try {
      const partialValidationResponse = await axios.post(
        `https://web-production-6df54.up.railway.app/debug/campaign/2/validate`,
        { config: partialConfig }
      );
      
      console.log('✅ Partial Update Validation Response:');
      console.log(JSON.stringify(partialValidationResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Partial Update Validation Failed:');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data);
    }
    
  } catch (error) {
    console.error('Script error:', error.message);
  }
}

testCampaignValidation();