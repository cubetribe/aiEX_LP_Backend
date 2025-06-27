// Custom field component for campaign preview
import React from 'react';

const CampaignPreviewField = ({ value }) => {
  if (!value) {
    return (
      <div className="campaign-preview-section">
        <p style={{ margin: 0, color: '#666' }}>
          💡 Preview URL wird automatisch generiert nach dem Speichern
        </p>
      </div>
    );
  }

  const handlePreview = () => {
    window.open(value, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      // You could add a toast notification here
      alert('Preview URL copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <div className="campaign-preview-section">
      <div style={{ marginBottom: '12px' }}>
        <strong>🎯 Campaign Preview</strong>
      </div>
      
      <div style={{ marginBottom: '12px', fontSize: '14px', color: '#666' }}>
        {value}
      </div>
      
      <div style={{ display: 'flex', gap: '12px' }}>
        <button 
          type="button"
          className="preview-button"
          onClick={handlePreview}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
          </svg>
          Live Preview öffnen
        </button>
        
        <button 
          type="button"
          style={{
            background: 'transparent',
            border: '2px solid #667eea',
            color: '#667eea',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          onClick={handleCopy}
        >
          📋 URL kopieren
        </button>
      </div>
    </div>
  );
};

export default CampaignPreviewField;