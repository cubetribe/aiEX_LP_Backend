// Script to create test3 campaign directly via Strapi API
const axios = require('axios');

async function createTestCampaign() {
  try {
    console.log('Creating test3 campaign...');
    
    const campaignData = {
      data: {
        title: "Simple Test Campaign",
        slug: "test3",
        description: "Eine einfache Test-Kampagne mit nur einer Frage",
        campaignType: "quiz",
        status: "active",
        isActive: true,
        showResultImmediately: true,
        requireEmailForResult: false,
        resultDeliveryMode: "show_only",
        resultDisplayConfig: {
          sendEmail: false,
          showOnScreen: true,
          emailRequired: false,
          resultPageTitle: "Ihr Test-Ergebnis",
          showShareButton: false,
          showDownloadButton: false
        },
        config: {
          type: "quiz",
          questions: [
            {
              id: "q1",
              type: "single-choice",
              order: 1,
              question: "Wie gefällt Ihnen KI?",
              options: ["Sehr gut", "Gut", "Okay", "Nicht so gut"],
              required: true
            }
          ],
          scoring: {
            logic: "simple"
          },
          styling: {
            primaryColor: "#3f51b5",
            secondaryColor: "#f50057"
          },
          behavior: {
            allowBack: true,
            showProgress: true
          }
        },
        aiPromptTemplate: "Based on the user response: {{responses}}\n\nProvide a simple AI assessment in German."
      }
    };

    // Try to create via public routes first
    try {
      const response = await axios.post('https://web-production-6df54.up.railway.app/campaigns/public', campaignData.data);
      console.log('✅ Campaign created successfully:', response.data);
      return response.data;
    } catch (publicError) {
      console.log('❌ Public route failed:', publicError.response?.status);
      console.log('Response:', publicError.response?.data);
      
      // Check if campaign already exists
      try {
        const checkResponse = await axios.get('https://web-production-6df54.up.railway.app/campaigns/public/test3');
        console.log('✅ Campaign test3 already exists:', checkResponse.data);
        return checkResponse.data;
      } catch (checkError) {
        console.log('❌ Campaign test3 does not exist');
        console.log('Manual creation needed via Admin Panel');
        
        console.log('\n📋 Campaign Data for Manual Creation:');
        console.log(JSON.stringify(campaignData.data, null, 2));
      }
    }
    
  } catch (error) {
    console.error('Script error:', error.message);
  }
}

createTestCampaign();