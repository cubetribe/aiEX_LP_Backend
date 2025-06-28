export default {
  config: {
    // Custom admin panel configurations
    theme: {
      light: {},
      dark: {},
    },
    translations: {
      en: {
        'app.components.HomePage.welcome': 'Welcome to GoAIX Campaign Manager!',
        'app.components.HomePage.welcome.again': 'Welcome back to GoAIX!',
        'campaign.conditional-logic.title': 'Conditional Logic Configuration',
        'campaign.conditional-logic.description': 'Advanced quiz configuration with dynamic question flows',
        'campaign.templates.load': 'Load Template',
        'campaign.templates.help': 'Show Help',
        'campaign.jsoncode.placeholder': 'Enter JSON configuration for advanced conditional logic...',
      },
    },
    head: {
      favicon: '/favicon.ico',
    },
  },
  bootstrap(app) {
    console.log('GoAIX Admin Panel Bootstrap');
    
    // Admin extensions - AKTIVIERT für erweiterte Features!
    console.log('🚀 Admin extensions ACTIVATED - Injecting custom features...');
    
    // Inject AI Prompt Tester as a custom button
    setTimeout(() => {
      try {
        // Add AI Prompt Tester button to admin menu
        const navContainer = document.querySelector('.main-nav-wrapper');
        if (navContainer) {
          const aiTesterBtn = document.createElement('a');
          aiTesterBtn.href = '#';
          aiTesterBtn.className = 'main-nav-link';
          aiTesterBtn.innerHTML = '🤖 AI Prompt Tester';
          aiTesterBtn.onclick = (e) => {
            e.preventDefault();
            window.open('/admin/ai-prompt-tester', 'AI Prompt Tester', 'width=1200,height=800');
          };
          navContainer.appendChild(aiTesterBtn);
          console.log('✅ AI Prompt Tester button added');
        }
      } catch (err) {
        console.error('Failed to inject AI Tester:', err);
      }
    }, 3000);
    
    // Add custom styles for admin extensions
    const style = document.createElement('style');
    style.textContent = `
      .preview-button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
        margin: 16px 0;
        font-size: 14px;
      }
      
      .preview-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
        color: white;
        text-decoration: none;
      }
      
      .preview-button svg {
        width: 16px;
        height: 16px;
      }
      
      .campaign-preview-section {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 16px;
        margin: 16px 0;
      }
      
      /* Conditional Logic Helper Styles */
      .conditional-logic-container {
        display: grid;
        grid-template-columns: 1fr 400px;
        gap: 20px;
        margin: 16px 0;
      }
      
      .conditional-logic-help {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 16px;
        max-height: 600px;
        overflow-y: auto;
      }
      
      .template-selector-button {
        background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
        color: white;
        border: none;
        padding: 10px 16px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        margin-bottom: 8px;
        transition: all 0.2s ease;
      }
      
      .template-selector-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
      }
      
      .help-toggle-button {
        background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
        color: white;
        border: none;
        padding: 10px 16px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        margin-bottom: 8px;
        margin-left: 8px;
        transition: all 0.2s ease;
      }
      
      .help-toggle-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 15px rgba(23, 162, 184, 0.3);
      }
      
      .jsoncode-field-wrapper {
        position: relative;
      }
      
      .jsoncode-field-buttons {
        display: flex;
        gap: 8px;
        margin-bottom: 8px;
      }
      
      /* JSON Code Editor Improvements */
      .jsoncode-textarea {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace !important;
        font-size: 13px !important;
        line-height: 1.5 !important;
        background: #f8f9fa !important;
        border: 1px solid #ddd !important;
        border-radius: 4px !important;
        padding: 12px !important;
      }
      
      .jsoncode-textarea:focus {
        border-color: #007bff !important;
        box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25) !important;
      }
      
      /* Template Preview */
      .template-preview-card {
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 16px;
        margin: 8px 0;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .template-preview-card:hover {
        border-color: #007bff;
        box-shadow: 0 2px 8px rgba(0, 123, 255, 0.15);
      }
      
      .template-preview-card.selected {
        border-color: #007bff;
        background: #f0f8ff;
      }
    `;
    document.head.appendChild(style);
    
    // Admin panel initialization complete
    console.log('GoAIX Admin Panel: Conditional Logic extensions loaded');
  },
};