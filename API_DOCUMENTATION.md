# GoAIX Platform API Documentation

## Overview

The GoAIX Platform API provides endpoints for managing AI-powered lead generation campaigns at quiz.goaiex.com.

### Base URLs
- **Production**: `https://api.quiz.goaiex.com`
- **Development**: `http://localhost:1337`

### Authentication
Most endpoints are public and do not require authentication. Admin endpoints use JWT Bearer tokens.

## Frontend Integration Guide

### 1. Campaign Loading Flow

```javascript
// Check if campaign exists and is available
const campaignInfo = await fetch('/api/campaigns/{slug}/info');

if (campaignInfo.data.isAvailable) {
  // Load full campaign data
  const campaign = await fetch('/api/campaigns/{slug}/public');
  // Render campaign form
}
```

### 2. Lead Submission Flow

```javascript
// Submit lead data
const submission = await fetch('/api/leads/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    campaignSlug: 'my-campaign',
    firstName: 'John',
    email: 'john@example.com',
    responses: { q1: 'answer1', q2: 'answer2' },
    consentGiven: true
  })
});

const { leadId } = submission.data;

// Poll for status updates
const checkStatus = async () => {
  const status = await fetch(`/api/leads/${leadId}/status`);
  return status.data;
};

// Or use Server-Sent Events for real-time updates
const eventSource = new EventSource(`/api/leads/${leadId}/subscribe`);
eventSource.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('Lead update:', update);
};
```

### 3. Result Display

```javascript
// Get formatted AI result
const result = await fetch(`/api/leads/${leadId}/result-formatted`);

if (result.success) {
  // Display AI-generated content
  displayResult(result.data.content);
}
```

## API Endpoints

### Campaign Endpoints

#### GET /api/campaigns/{slug}/public
Get complete campaign data optimized for frontend display.

**Parameters:**
- `slug` (path, required): Campaign slug identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "slug": "leadmagnet-quiz",
    "title": "AI Marketing Quiz",
    "description": "Discover your AI marketing potential",
    "campaignType": "quiz",
    "config": {
      "questions": [
        {
          "id": "q1",
          "question": "What is your biggest marketing challenge?",
          "type": "multiple-choice",
          "options": ["Lead Generation", "Content Creation", "Analytics", "Budget"],
          "required": true
        }
      ]
    },
    "styling": {
      "cssCustomization": "/* custom styles */",
      "successRedirectUrl": "https://quiz.goaiex.com/thank-you",
      "errorRedirectUrl": "https://quiz.goaiex.com/error"
    },
    "metadata": {
      "leadCount": 42,
      "maxLeads": 1000,
      "capacityPercentage": 4
    },
    "timing": {
      "isActive": true,
      "hasTimeLimit": false
    },
    "metrics": {
      "totalLeads": 42,
      "conversionRate": 85,
      "averageScore": 73.2
    }
  }
}
```

#### GET /api/campaigns/{slug}/info
Get lightweight campaign info for quick validation.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "slug": "leadmagnet-quiz",
    "title": "AI Marketing Quiz",
    "type": "quiz",
    "isAvailable": true,
    "hasCapacityLimit": true,
    "capacityRemaining": 958
  }
}
```

#### POST /api/campaigns/{slug}/validate
Validate if campaign is ready to accept submissions.

**Response:**
```json
{
  "success": true,
  "valid": true,
  "reason": null,
  "campaign": {
    "id": 1,
    "slug": "leadmagnet-quiz",
    "title": "AI Marketing Quiz",
    "type": "quiz"
  }
}
```

### Lead Endpoints

#### POST /api/leads/submit
Submit a new lead to a campaign.

**Request Body:**
```json
{
  "campaignSlug": "leadmagnet-quiz",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+49 123 456789",
  "company": "Acme Corp",
  "jobTitle": "Marketing Manager",
  "responses": {
    "q1": "Lead Generation",
    "q2": "Less than 1 year",
    "q3": "B2B"
  },
  "consentGiven": true,
  "marketingOptIn": true,
  "customFields": {},
  "utmSource": "google",
  "utmMedium": "cpc",
  "utmCampaign": "ai-quiz-campaign"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Lead submitted successfully",
  "data": {
    "leadId": 123,
    "firstName": "John",
    "email": "john.doe@example.com",
    "leadScore": 75,
    "leadQuality": "warm",
    "processingStatus": "queued",
    "estimatedProcessingTime": "2-5 minutes",
    "campaign": {
      "id": 1,
      "slug": "leadmagnet-quiz",
      "title": "AI Marketing Quiz",
      "type": "quiz"
    }
  }
}
```

#### GET /api/leads/{id}/status
Check lead processing status and progress.

**Response:**
```json
{
  "success": true,
  "data": {
    "leadId": 123,
    "processingStatus": "completed",
    "hasResult": true,
    "emailSent": true,
    "googleSheetsExported": true,
    "estimatedCompletion": "Processing completed",
    "progress": 100,
    "campaign": {
      "id": 1,
      "slug": "leadmagnet-quiz",
      "title": "AI Marketing Quiz"
    },
    "createdAt": "2024-06-26T10:30:00Z",
    "updatedAt": "2024-06-26T10:33:15Z"
  }
}
```

#### GET /api/leads/{id}/result-formatted
Get the AI-generated result with formatting for frontend display.

**Response:**
```json
{
  "success": true,
  "data": {
    "content": "Based on your responses, you have strong potential in AI-driven marketing...",
    "leadInfo": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "leadScore": 75,
      "leadQuality": "warm"
    },
    "campaign": {
      "title": "AI Marketing Quiz",
      "type": "quiz"
    },
    "processing": {
      "provider": "openai",
      "model": "gpt-4",
      "tokensUsed": 512,
      "processingTime": 2340,
      "completedAt": "2024-06-26T10:33:15Z"
    },
    "metadata": {
      "resultLength": 1245,
      "wordCount": 187
    }
  }
}
```

#### GET /api/leads/{id}/subscribe
Subscribe to real-time lead processing updates via Server-Sent Events.

**Response:** Stream of Server-Sent Events
```
data: {"leadId": 123, "processingStatus": "processing", "hasResult": false, "timestamp": "2024-06-26T10:31:00Z"}

data: {"leadId": 123, "processingStatus": "completed", "hasResult": true, "emailSent": true, "timestamp": "2024-06-26T10:33:15Z"}
```

### System Endpoints

#### GET /health
Check system health and status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-06-26T10:30:00Z",
  "version": "1.0.0",
  "environment": "production",
  "uptime": 3600.5
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "status": 400,
    "name": "ValidationError",
    "message": "Invalid input data",
    "details": "Email field is required"
  }
}
```

### Common Error Codes
- `400` - Bad Request (validation errors)
- `403` - Forbidden (campaign unavailable, capacity reached)
- `404` - Not Found (campaign/lead not found)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Rate Limiting

- **Public endpoints**: 100 requests per minute per IP
- **SSE endpoints**: 20 connections per IP
- **Admin endpoints**: 200 requests per minute

## Campaign Types

### Quiz Campaigns
Configuration structure for quiz-type campaigns:
```json
{
  "type": "quiz",
  "questions": [
    {
      "id": "q1",
      "question": "What is your main goal?",
      "type": "multiple-choice",
      "options": ["A", "B", "C", "D"],
      "required": true
    }
  ],
  "scoring": {
    "logic": "weighted",
    "weights": { "A": 10, "B": 7, "C": 5, "D": 3 }
  }
}
```

### Chatbot Campaigns
```json
{
  "type": "chatbot",
  "initialMessage": "Hello! How can I help?",
  "conversationFlow": {
    "maxMessages": 10,
    "collectEmail": true
  }
}
```

### Image Upload Campaigns
```json
{
  "type": "imageUpload",
  "allowedTypes": ["image/jpeg", "image/png"],
  "maxFileSize": 5242880,
  "analysisPrompt": "Analyze this image and provide feedback..."
}
```

### Text-Only Campaigns
```json
{
  "type": "textOnly",
  "fields": [
    {
      "name": "challenge",
      "label": "What's your biggest challenge?",
      "type": "textarea",
      "required": true
    }
  ]
}
```

## Security Considerations

### CORS Policy
The API is configured for quiz.goaiex.com domains:
- `https://quiz.goaiex.com`
- `https://www.quiz.goaiex.com` 
- `https://admin.quiz.goaiex.com`

### Data Privacy
- All lead data is handled according to GDPR requirements
- Explicit consent is required for data processing
- Users can request data deletion via admin panel

### Rate Limiting
- Implemented to prevent abuse
- Different limits for different endpoint types
- IP-based tracking with reasonable limits

## Integration Examples

### React Integration
```jsx
import { useState, useEffect } from 'react';

function CampaignForm({ slug }) {
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCampaign = async () => {
      try {
        const response = await fetch(`/api/campaigns/${slug}/public`);
        const data = await response.json();
        setCampaign(data.data);
      } catch (error) {
        console.error('Failed to load campaign:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCampaign();
  }, [slug]);

  const submitLead = async (formData) => {
    const response = await fetch('/api/leads/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignSlug: slug,
        ...formData,
        consentGiven: true,
      }),
    });

    const result = await response.json();
    return result.data.leadId;
  };

  if (loading) return <div>Loading...</div>;
  if (!campaign) return <div>Campaign not found</div>;

  return (
    <div>
      <h1>{campaign.title}</h1>
      <p>{campaign.description}</p>
      {/* Render campaign form based on campaign.config */}
    </div>
  );
}
```

### Vue.js Integration
```vue
<template>
  <div v-if="campaign">
    <h1>{{ campaign.title }}</h1>
    <form @submit.prevent="submitForm">
      <!-- Dynamic form based on campaign.config -->
    </form>
  </div>
</template>

<script>
export default {
  data() {
    return {
      campaign: null,
      formData: {},
    };
  },
  async mounted() {
    await this.loadCampaign();
  },
  methods: {
    async loadCampaign() {
      const response = await fetch(`/api/campaigns/${this.$route.params.slug}/public`);
      this.campaign = (await response.json()).data;
    },
    async submitForm() {
      const response = await fetch('/api/leads/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignSlug: this.$route.params.slug,
          ...this.formData,
          consentGiven: true,
        }),
      });
      
      const result = await response.json();
      this.$router.push(`/result/${result.data.leadId}`);
    },
  },
};
</script>
```

## Support

For API support and questions:
- Email: support@quiz.goaiex.com
- Documentation: https://docs.quiz.goaiex.com
- Status Page: https://status.quiz.goaiex.com

## Changelog

### v1.0.0 (2024-06-26)
- Initial API release
- Campaign and lead management endpoints
- Real-time processing updates via SSE
- Google Sheets integration
- Multi-AI provider support
- Comprehensive error handling