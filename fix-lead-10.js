// Temporary script to complete Lead 10 for frontend testing
const axios = require('axios');

async function completeLead10() {
  try {
    // Create a test AI result
    const testAiResult = `Hallo!

Basierend auf Ihren Antworten sehe ich großes Potenzial für KI in Ihrem Bereich.

🎯 **Ihre Einschätzung:**
Sie zeigen eine hohe Bereitschaft für KI-Integration mit einem Lead-Score von 100/100 (hot Lead).

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

    // Direct database update via Strapi route (if available)
    const response = await axios.post('https://web-production-6df54.up.railway.app/debug/complete-lead-10', {
      aiResult: testAiResult
    });
    
    console.log('Lead 10 completed:', response.data);
  } catch (error) {
    console.error('Failed to complete lead 10:', error.message);
  }
}

completeLead10();