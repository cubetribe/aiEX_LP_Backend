#!/usr/bin/env node

/**
 * AI Processing Fix Validation Test
 * Tests the fixes for automatic AI processing trigger
 */

const fetch = require('node-fetch');

const CONFIG = {
  BACKEND_URL: 'https://web-production-6df54.up.railway.app',
  TEST_EMAIL: 'test@cubetribe.de'
};

const log = (message, type = 'INFO') => {
  const prefix = { 'INFO': '🔍', 'SUCCESS': '✅', 'ERROR': '❌', 'WARNING': '⚠️' }[type] || '📝';
  console.log(`${prefix} [${new Date().toISOString()}] ${message}`);
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runFixValidationTest = async () => {
  try {
    log('🚀 TESTING AI PROCESSING FIXES', 'INFO');
    log('Expected: Lead submission should trigger automatic AI processing', 'INFO');
    log('='.repeat(80), 'INFO');
    
    // 1. Submit a lead and capture the ID
    log('📝 Submitting test lead...', 'INFO');
    const submissionData = {
      firstName: 'Fix Test User',
      email: CONFIG.TEST_EMAIL,
      responses: {
        testfrage_1: 'Ja',
        testfrage_2: 'Testing AI processing fix'
      }
    };
    
    const submitResponse = await fetch(`${CONFIG.BACKEND_URL}/campaigns/test3/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://aiex-quiz-platform-519nmqcf0-cubetribes-projects.vercel.app'
      },
      body: JSON.stringify(submissionData)
    });
    
    const submitData = await submitResponse.json();
    if (!submitResponse.ok) {
      log(`Submission failed: ${JSON.stringify(submitData)}`, 'ERROR');
      return false;
    }
    
    const leadId = submitData.data?.id;
    log(`Lead created: ${leadId}`, 'SUCCESS');
    
    // 2. Wait and monitor for automatic AI processing
    log('⏱️ Monitoring for automatic AI processing (30 seconds)...', 'INFO');
    
    let processed = false;
    let attempts = 0;
    const maxAttempts = 15; // 30 seconds total
    
    while (attempts < maxAttempts && !processed) {
      await sleep(2000);
      attempts++;
      
      const statusResponse = await fetch(`${CONFIG.BACKEND_URL}/leads/${leadId}/status`);
      const statusData = await statusResponse.json();
      
      if (statusResponse.ok && statusData.data) {
        const lead = statusData.data;
        log(`Attempt ${attempts}/${maxAttempts}: Status = ${lead.status}, AI Result = ${lead.aiResult ? 'PRESENT' : 'NULL'}`, 'INFO');
        
        if (lead.aiResult && lead.aiResult.length > 0) {
          processed = true;
          log('🎉 SUCCESS! Automatic AI processing worked!', 'SUCCESS');
          log(`AI Result Preview: ${lead.aiResult.substring(0, 100)}...`, 'SUCCESS');
          log(`Lead Score: ${lead.leadScore}, Quality: ${lead.leadQuality}`, 'SUCCESS');
          break;
        }
      }
    }
    
    if (!processed) {
      log('❌ FAILURE: AI processing did not start automatically within 30 seconds', 'ERROR');
      
      // Try manual reprocess to confirm the system still works
      log('🔄 Testing manual reprocess as fallback...', 'INFO');
      const reprocessResponse = await fetch(`${CONFIG.BACKEND_URL}/leads/${leadId}/reprocess`, {
        method: 'POST'
      });
      
      if (reprocessResponse.ok) {
        const reprocessData = await reprocessResponse.json();
        if (reprocessData.data?.aiResult) {
          log('✅ Manual reprocess still works - issue is with automatic trigger', 'WARNING');
          return false;
        }
      }
      
      log('❌ Even manual reprocess failed - system broken', 'ERROR');
      return false;
    }
    
    // 3. Test multiple leads to ensure consistency
    log('🔄 Testing second lead for consistency...', 'INFO');
    
    const secondSubmit = await fetch(`${CONFIG.BACKEND_URL}/campaigns/test3/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://aiex-quiz-platform-519nmqcf0-cubetribes-projects.vercel.app'
      },
      body: JSON.stringify({
        firstName: 'Consistency Test',
        email: CONFIG.TEST_EMAIL,
        responses: { testfrage_1: 'Nein', testfrage_2: 'Second test' }
      })
    });
    
    const secondData = await secondSubmit.json();
    const secondLeadId = secondData.data?.id;
    
    if (secondLeadId) {
      log(`Second lead created: ${secondLeadId}`, 'SUCCESS');
      
      // Quick check for second lead processing
      await sleep(5000);
      const secondStatusResponse = await fetch(`${CONFIG.BACKEND_URL}/leads/${secondLeadId}/status`);
      const secondStatusData = await secondStatusResponse.json();
      
      if (secondStatusData.data?.aiResult) {
        log('✅ Second lead also processed automatically - fix is stable!', 'SUCCESS');
      } else {
        log('⚠️ Second lead not processed yet - may need more time', 'WARNING');
      }
    }
    
    return true;
    
  } catch (error) {
    log(`Test failed with error: ${error.message}`, 'ERROR');
    return false;
  }
};

// Run the test
runFixValidationTest().then(success => {
  log('='.repeat(80), 'INFO');
  if (success) {
    log('🎉 FIX VALIDATION: SUCCESS! AI processing is working automatically', 'SUCCESS');
    process.exit(0);
  } else {
    log('❌ FIX VALIDATION: FAILED! AI processing still needs attention', 'ERROR');
    process.exit(1);
  }
}).catch(error => {
  log(`Critical test error: ${error.message}`, 'ERROR');
  process.exit(1);
});