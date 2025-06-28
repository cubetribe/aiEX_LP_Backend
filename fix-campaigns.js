// Fix campaign isActive status
const axios = require('axios');

async function fixCampaigns() {
  try {
    console.log('🔧 Fixing campaign isActive status...');
    
    // Test direct API access
    console.log('\n📋 Current campaign status:');
    const campaigns = await axios.get('https://web-production-6df54.up.railway.app/campaigns/public');
    console.log(JSON.stringify(campaigns.data, null, 2));
    
    console.log('\n🔧 The problem: isActive is null for both campaigns');
    console.log('✅ Solution: Update via admin panel or direct Strapi API');
    
    console.log('\n📝 Manual fix needed:');
    console.log('1. Open: https://web-production-6df54.up.railway.app/admin');
    console.log('2. Go to: Content-Types → Campaigns');
    console.log('3. Edit both campaigns and set isActive = true');
    console.log('4. Or use Strapi API with authentication');
    
    // Test slug-based submit to confirm it still works
    console.log('\n🧪 Testing slug-based submit (should work):');
    try {
      const slugTest = await axios.post('https://web-production-6df54.up.railway.app/campaigns/test3/submit', {
        firstName: 'Slug Test',
        email: 'slug@test.com',
        responses: { testfrage_1: 'Ja' }
      });
      console.log('✅ Slug-based submit works:', slugTest.data);
    } catch (error) {
      console.log('❌ Slug-based submit failed:', error.response?.data);
    }
    
    // Test ID-based submit
    console.log('\n🧪 Testing ID-based submit (expected to fail until isActive=true):');
    try {
      const idTest = await axios.post('https://web-production-6df54.up.railway.app/campaigns/2/submit', {
        firstName: 'ID Test',
        email: 'id@test.com', 
        responses: { testfrage_1: 'Ja' }
      });
      console.log('✅ ID-based submit works:', idTest.data);
    } catch (error) {
      console.log('❌ ID-based submit failed:', error.response?.data);
    }
    
  } catch (error) {
    console.error('Script error:', error.message);
  }
}

fixCampaigns();