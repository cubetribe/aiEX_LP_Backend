#!/usr/bin/env node

/**
 * Quick Queue Test - Diagnose AI Processing Issue
 */

const fetch = require('node-fetch');

const CONFIG = {
  BACKEND_URL: 'https://web-production-6df54.up.railway.app',
  TEST_EMAIL: 'test@cubetribe.de'
};

const log = (message) => console.log(`[${new Date().toISOString()}] ${message}`);

const runQuickTest = async () => {
  try {
    log('🔍 QUICK QUEUE DIAGNOSTIC TEST');
    
    // 1. Check initial queue status
    log('📊 Checking initial queue status...');
    const initialStatus = await fetch(`${CONFIG.BACKEND_URL}/queues/status`);
    const initialData = await initialStatus.json();
    log(`Initial jobs: ${initialData.data?.totalJobs || 0}`);
    
    // 2. Submit a lead
    log('📝 Submitting test lead...');
    const submissionData = {
      firstName: 'Queue Test',
      email: CONFIG.TEST_EMAIL,
      responses: {
        testfrage_1: 'Ja',
        testfrage_2: 'Queue test answer'
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
      log(`❌ Submission failed: ${JSON.stringify(submitData)}`);
      return;
    }
    
    const leadId = submitData.data?.id;
    log(`✅ Lead created: ${leadId}`);
    
    // 3. Wait a moment for async processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 4. Check queue status after submission
    log('📊 Checking queue status after submission...');
    const afterStatus = await fetch(`${CONFIG.BACKEND_URL}/queues/status`);
    const afterData = await afterStatus.json();
    log(`Jobs after submission: ${afterData.data?.totalJobs || 0}`);
    
    // 5. Check detailed queue status
    const detailedStatus = await fetch(`${CONFIG.BACKEND_URL}/debug/queue-status`);
    const detailedData = await detailedStatus.json();
    log(`Queue service available: ${detailedData.data?.queue?.available}`);
    log(`Queue initialized: ${detailedData.data?.queue?.initialized}`);
    
    // 6. Check lead status
    log('📋 Checking lead status...');
    const leadStatus = await fetch(`${CONFIG.BACKEND_URL}/leads/${leadId}/status`);
    const leadData = await leadStatus.json();
    log(`Lead status: ${JSON.stringify(leadData.data, null, 2)}`);
    
    // 7. Try manual reprocess to confirm AI works
    log('🔄 Testing manual reprocess...');
    const reprocessResponse = await fetch(`${CONFIG.BACKEND_URL}/leads/${leadId}/reprocess`, {
      method: 'POST'
    });
    const reprocessData = await reprocessResponse.json();
    
    if (reprocessResponse.ok && reprocessData.data?.aiResult) {
      log('✅ Manual reprocess works! AI system is functional.');
      log(`AI Result: ${reprocessData.data.aiResult.substring(0, 100)}...`);
    } else {
      log('❌ Manual reprocess failed');
    }
    
    // 8. Final diagnosis
    log('\n🔍 DIAGNOSIS:');
    if (afterData.data?.totalJobs > initialData.data?.totalJobs) {
      log('✅ Queue jobs were added - AI processing should be working');
    } else {
      log('❌ No queue jobs added - Lead submission is not triggering AI processing');
      log('💡 Issue: handleQueuedResultDelivery is not being called or failing silently');
    }
    
  } catch (error) {
    log(`❌ Test failed: ${error.message}`);
  }
};

runQuickTest();