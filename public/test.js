const API = 'https://web-production-6df54.up.railway.app';

async function apiCall(url, options = {}) {
    try {
        console.log('API Call:', url);
        const response = await fetch(url, options);
        const data = await response.json();
        console.log('Response:', data);
        return data;
    } catch (error) {
        console.error('API Error:', error);
        return { error: error.message };
    }
}

async function testStatus() {
    const result = await apiCall(`${API}/leads/18/status`);
    document.getElementById('results').innerHTML = `<h3>Status Result:</h3><pre>${JSON.stringify(result, null, 2)}</pre>`;
}

async function testResult() {
    const result = await apiCall(`${API}/leads/18/result`);
    document.getElementById('results').innerHTML = `<h3>Result API:</h3><pre>${JSON.stringify(result, null, 2)}</pre>`;
}

async function testCampaign() {
    const result = await apiCall(`${API}/campaigns/2/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'Test', email: 'test@test.com', responses: { testfrage_1: 'Ja' } })
    });
    document.getElementById('results').innerHTML = `<h3>Campaign Submit:</h3><pre>${JSON.stringify(result, null, 2)}</pre>`;
}

async function loadStatus() {
    console.log('Loading Lead 18 Status...');
    const result = await apiCall(`${API}/leads/18/status`);
    
    if (result.success && result.data) {
        const lead = result.data;
        document.getElementById('status').innerHTML = `
            <div class="success">
                ✅ <strong>Status:</strong> ${lead.status}<br>
                📊 <strong>Progress:</strong> ${lead.progress}%<br>
                📈 <strong>Score:</strong> ${lead.leadScore} (${lead.leadQuality})<br>
                🤖 <strong>AI Result:</strong> ${lead.aiResult ? 'Available' : 'None'}
            </div>
        `;
        
        if (lead.status === 'completed') {
            loadAIResult();
        }
    } else {
        document.getElementById('status').innerHTML = `
            <div class="error">
                ❌ <strong>Error:</strong> ${result.error || 'Failed to load'}<br>
                <pre>${JSON.stringify(result, null, 2)}</pre>
            </div>
        `;
    }
}

async function loadAIResult() {
    console.log('Loading AI Result...');
    const result = await apiCall(`${API}/leads/18/result`);
    
    if (result.data && result.data.aiResult) {
        const ai = result.data.aiResult;
        document.getElementById('airesult').innerHTML = `
            <div class="success">
                <h3>🎯 ${ai.title}</h3>
                <p><em>${ai.summary}</em></p>
                ${ai.sections.map(s => `
                    <div style="margin: 15px 0;">
                        <h4>${s.title}</h4>
                        <div style="white-space: pre-wrap; line-height: 1.5;">${s.content}</div>
                    </div>
                `).join('')}
                <div style="margin-top: 15px; padding: 10px; background: #e3f2fd; border-radius: 4px;">
                    <strong>📊 Metadata:</strong><br>
                    Score: ${ai.metadata.leadScore} | Quality: ${ai.metadata.leadQuality} | 
                    Provider: ${ai.metadata.aiProvider} | Confidence: ${(ai.metadata.confidence * 100).toFixed(1)}%
                </div>
            </div>
        `;
    } else {
        document.getElementById('airesult').innerHTML = `
            <div class="error">
                ❌ <strong>No AI Result:</strong><br>
                <pre>${JSON.stringify(result, null, 2)}</pre>
            </div>
        `;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Emergency Test initialized');
    
    // Add button event listeners
    document.getElementById('btn-status').addEventListener('click', testStatus);
    document.getElementById('btn-result').addEventListener('click', testResult);
    document.getElementById('btn-campaign').addEventListener('click', testCampaign);
    
    // Auto-load data
    loadStatus();
});