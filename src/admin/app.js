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
      },
    },
    head: {
      favicon: '/favicon.ico',
    },
  },
  bootstrap(app) {
    console.log('GoAIX Admin Panel Bootstrap');
    
    // Add custom styles for preview button
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
    `;
    document.head.appendChild(style);
  },
};