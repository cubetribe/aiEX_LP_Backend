// Complete Lead 11 manually using Strapi API
const axios = require('axios');

async function completeLead11() {
  try {
    console.log('Attempting to complete Lead 11...');
    
    const testAiResult = `Hallo!

Basierend auf Ihren Antworten sehe ich großes Potenzial für KI in Ihrem Bereich.

🎯 **Ihre Einschätzung:**
Sie zeigen eine hohe Bereitschaft für KI-Integration mit einem Lead-Score von 82/100 (hot Lead).

💡 **AI-Potenzial für Sie:**
• Automatisierung von Routineaufgaben
• Datenanalyse und Insights
• Kundenservice-Verbesserung
• Produktivitätssteigerung

📋 **Konkrete nächste Schritte:**
1. Starten Sie mit ChatGPT für erste Erfahrungen
2. Testen Sie Notion AI für Produktivität
3. Evaluieren Sie branchenspezifische AI-Tools

🚀 **Empfehlungen:**
- Beginnen Sie mit kleinen Projekten
- Schulen Sie Ihr Team schrittweise
- Achten Sie auf Datenschutz-Compliance

Viel Erfolg auf Ihrer KI-Reise!`;

    // Try different route patterns
    const urls = [
      'https://web-production-6df54.up.railway.app/debug/complete-lead/11',
      'https://web-production-6df54.up.railway.app/complete-lead/11'
    ];
    
    for (const url of urls) {
      try {
        console.log(`Trying: ${url}`);
        const response = await axios.post(url, {
          aiResult: testAiResult
        }, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ Success:', response.data);
        return response.data;
      } catch (error) {
        console.log(`❌ Failed ${url}:`, error.response?.status || error.message);
      }
    }
    
    console.log('All completion attempts failed. Checking current status...');
    
    // Check current status
    const statusResponse = await axios.get('https://web-production-6df54.up.railway.app/leads/11/status');
    console.log('Current Lead 11 status:', statusResponse.data);
    
  } catch (error) {
    console.error('Script error:', error.message);
  }
}

completeLead11();