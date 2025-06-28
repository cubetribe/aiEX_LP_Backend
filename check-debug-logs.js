// Script to check debug logs from database
const axios = require('axios');

async function checkDebugLogs() {
  try {
    console.log('🔍 Checking debug logs...\n');
    
    // Check latest debug logs
    const endpoints = [
      '/debug/logs/latest',
      '/debug/logs/api',
      '/debug/logs/campaign',
      '/debug/logs/lead'
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`📋 ${endpoint}:`);
        const response = await axios.get(`https://web-production-6df54.up.railway.app${endpoint}`);
        console.log(JSON.stringify(response.data, null, 2));
        console.log('---\n');
      } catch (error) {
        console.log(`❌ ${endpoint}: ${error.response?.status || error.message}\n`);
      }
    }
    
    // Check specific lead logs
    console.log('🎯 Checking Lead 18 specific logs...');
    try {
      const leadResponse = await axios.get('https://web-production-6df54.up.railway.app/debug/logs/lead/18');
      console.log('Lead 18 logs:', JSON.stringify(leadResponse.data, null, 2));
    } catch (error) {
      console.log(`❌ Lead 18 logs: ${error.response?.status || error.message}`);
    }
    
  } catch (error) {
    console.error('Script error:', error.message);
  }
}

checkDebugLogs();