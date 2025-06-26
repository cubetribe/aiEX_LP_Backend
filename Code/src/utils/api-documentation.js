/**
 * API Documentation Generator
 * Generates OpenAPI/Swagger documentation for GoAIX Platform
 */

'use strict';

/**
 * Generate OpenAPI 3.0 specification for GoAIX Platform
 * @returns {Object} OpenAPI specification
 */
function generateOpenAPISpec() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'GoAIX Platform API',
      version: '1.0.0',
      description: 'AI-Lead-Magnet-Plattform API für quiz.goaiex.com',
      contact: {
        name: 'GoAIX Support',
        email: 'support@quiz.goaiex.com',
        url: 'https://quiz.goaiex.com/support',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'https://api.quiz.goaiex.com',
        description: 'Production Server',
      },
      {
        url: 'http://localhost:1337',
        description: 'Development Server',
      },
    ],
    paths: {
      // Campaign Endpoints
      '/api/campaigns/{slug}/public': {
        get: {
          tags: ['Campaigns'],
          summary: 'Get campaign data optimized for frontend',
          description: 'Retrieves complete campaign information with frontend-optimized formatting',
          parameters: [
            {
              name: 'slug',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Campaign slug identifier',
              example: 'leadmagnet-quiz',
            },
          ],
          responses: {
            200: {
              description: 'Campaign data retrieved successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CampaignPublicResponse' },
                },
              },
            },
            404: { $ref: '#/components/responses/NotFound' },
            403: { $ref: '#/components/responses/Forbidden' },
          },
        },
      },
      '/api/campaigns/{slug}/info': {
        get: {
          tags: ['Campaigns'],
          summary: 'Get lightweight campaign info',
          description: 'Quick campaign validation and basic info for frontend routing',
          parameters: [
            {
              name: 'slug',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Campaign slug identifier',
            },
          ],
          responses: {
            200: {
              description: 'Campaign info retrieved successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CampaignInfoResponse' },
                },
              },
            },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/campaigns/{slug}/validate': {
        post: {
          tags: ['Campaigns'],
          summary: 'Validate campaign submission readiness',
          description: 'Checks if campaign is ready to accept lead submissions',
          parameters: [
            {
              name: 'slug',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Campaign slug identifier',
            },
          ],
          responses: {
            200: {
              description: 'Validation result',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ValidationResponse' },
                },
              },
            },
          },
        },
      },
      // Lead Endpoints
      '/api/leads/submit': {
        post: {
          tags: ['Leads'],
          summary: 'Submit new lead to campaign',
          description: 'Primary endpoint for lead submission from frontend forms',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LeadSubmissionRequest' },
              },
            },
          },
          responses: {
            201: {
              description: 'Lead submitted successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/LeadSubmissionResponse' },
                },
              },
            },
            400: { $ref: '#/components/responses/BadRequest' },
            403: { $ref: '#/components/responses/Forbidden' },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/leads/{id}/status': {
        get: {
          tags: ['Leads'],
          summary: 'Check lead processing status',
          description: 'Get current processing status and progress information',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
              description: 'Lead ID',
            },
          ],
          responses: {
            200: {
              description: 'Lead status retrieved successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/LeadStatusResponse' },
                },
              },
            },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/leads/{id}/result-formatted': {
        get: {
          tags: ['Leads'],
          summary: 'Get formatted AI result',
          description: 'Retrieve processed AI result with formatted response for frontend display',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
              description: 'Lead ID',
            },
          ],
          responses: {
            200: {
              description: 'AI result retrieved successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/LeadResultResponse' },
                },
              },
            },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/leads/{id}/subscribe': {
        get: {
          tags: ['Leads'],
          summary: 'Subscribe to lead processing updates',
          description: 'Server-Sent Events endpoint for real-time lead processing updates',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
              description: 'Lead ID',
            },
          ],
          responses: {
            200: {
              description: 'SSE stream established',
              content: {
                'text/event-stream': {
                  schema: {
                    type: 'string',
                    description: 'Server-Sent Events stream with lead status updates',
                  },
                },
              },
            },
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      // Health Check
      '/health': {
        get: {
          tags: ['System'],
          summary: 'Health check endpoint',
          description: 'Check system health and service status',
          responses: {
            200: {
              description: 'System is healthy',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthResponse' },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        // Campaign Schemas
        CampaignPublicResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                slug: { type: 'string', example: 'leadmagnet-quiz' },
                title: { type: 'string', example: 'AI Marketing Quiz' },
                description: { type: 'string', example: 'Discover your AI marketing potential' },
                campaignType: { 
                  type: 'string', 
                  enum: ['quiz', 'imageUpload', 'chatbot', 'textOnly', 'custom'],
                  example: 'quiz',
                },
                config: {
                  type: 'object',
                  description: 'Campaign-specific configuration',
                  example: {
                    questions: [
                      {
                        id: 'q1',
                        question: 'What is your biggest marketing challenge?',
                        type: 'multiple-choice',
                        options: ['Lead Generation', 'Content Creation', 'Analytics', 'Budget'],
                        required: true,
                      },
                    ],
                  },
                },
                styling: {
                  type: 'object',
                  properties: {
                    cssCustomization: { type: 'string' },
                    successRedirectUrl: { type: 'string' },
                    errorRedirectUrl: { type: 'string' },
                  },
                },
                metadata: {
                  type: 'object',
                  properties: {
                    leadCount: { type: 'integer', example: 42 },
                    maxLeads: { type: 'integer', example: 1000 },
                    capacityPercentage: { type: 'integer', example: 4 },
                  },
                },
                timing: {
                  type: 'object',
                  properties: {
                    isActive: { type: 'boolean', example: true },
                    hasTimeLimit: { type: 'boolean', example: false },
                  },
                },
                metrics: {
                  type: 'object',
                  properties: {
                    totalLeads: { type: 'integer', example: 42 },
                    conversionRate: { type: 'integer', example: 85 },
                    averageScore: { type: 'number', example: 73.2 },
                  },
                },
              },
            },
          },
        },
        CampaignInfoResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                slug: { type: 'string', example: 'leadmagnet-quiz' },
                title: { type: 'string', example: 'AI Marketing Quiz' },
                type: { type: 'string', example: 'quiz' },
                isAvailable: { type: 'boolean', example: true },
                hasCapacityLimit: { type: 'boolean', example: true },
                capacityRemaining: { type: 'integer', example: 958 },
              },
            },
          },
        },
        ValidationResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            valid: { type: 'boolean', example: true },
            reason: { type: 'string', example: null },
            campaign: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                slug: { type: 'string', example: 'leadmagnet-quiz' },
                title: { type: 'string', example: 'AI Marketing Quiz' },
                type: { type: 'string', example: 'quiz' },
              },
            },
          },
        },
        // Lead Schemas
        LeadSubmissionRequest: {
          type: 'object',
          required: ['campaignSlug', 'firstName', 'email', 'responses', 'consentGiven'],
          properties: {
            campaignSlug: { type: 'string', example: 'leadmagnet-quiz' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            email: { type: 'string', format: 'email', example: 'john.doe@example.com' },
            phone: { type: 'string', example: '+49 123 456789' },
            company: { type: 'string', example: 'Acme Corp' },
            jobTitle: { type: 'string', example: 'Marketing Manager' },
            responses: {
              type: 'object',
              description: 'Campaign-specific response data',
              example: {
                q1: 'Lead Generation',
                q2: 'Less than 1 year',
                q3: 'B2B',
              },
            },
            consentGiven: { type: 'boolean', example: true },
            marketingOptIn: { type: 'boolean', example: true },
            customFields: { type: 'object', example: {} },
            utmSource: { type: 'string', example: 'google' },
            utmMedium: { type: 'string', example: 'cpc' },
            utmCampaign: { type: 'string', example: 'ai-quiz-campaign' },
          },
        },
        LeadSubmissionResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Lead submitted successfully' },
            data: {
              type: 'object',
              properties: {
                leadId: { type: 'integer', example: 123 },
                firstName: { type: 'string', example: 'John' },
                email: { type: 'string', example: 'john.doe@example.com' },
                leadScore: { type: 'integer', example: 75 },
                leadQuality: { 
                  type: 'string',
                  enum: ['hot', 'warm', 'cold', 'unqualified'],
                  example: 'warm',
                },
                processingStatus: { type: 'string', example: 'queued' },
                estimatedProcessingTime: { type: 'string', example: '2-5 minutes' },
                campaign: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer', example: 1 },
                    slug: { type: 'string', example: 'leadmagnet-quiz' },
                    title: { type: 'string', example: 'AI Marketing Quiz' },
                    type: { type: 'string', example: 'quiz' },
                  },
                },
              },
            },
          },
        },
        LeadStatusResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                leadId: { type: 'integer', example: 123 },
                processingStatus: {
                  type: 'string',
                  enum: ['pending', 'processing', 'completed', 'failed', 'retry'],
                  example: 'completed',
                },
                hasResult: { type: 'boolean', example: true },
                emailSent: { type: 'boolean', example: true },
                googleSheetsExported: { type: 'boolean', example: true },
                estimatedCompletion: { type: 'string', example: 'Processing completed' },
                progress: { type: 'integer', example: 100 },
                campaign: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer', example: 1 },
                    slug: { type: 'string', example: 'leadmagnet-quiz' },
                    title: { type: 'string', example: 'AI Marketing Quiz' },
                  },
                },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        LeadResultResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                content: { 
                  type: 'string', 
                  description: 'AI-generated result content',
                  example: 'Based on your responses, you have strong potential in AI-driven marketing...',
                },
                leadInfo: {
                  type: 'object',
                  properties: {
                    firstName: { type: 'string', example: 'John' },
                    lastName: { type: 'string', example: 'Doe' },
                    email: { type: 'string', example: 'john.doe@example.com' },
                    leadScore: { type: 'integer', example: 75 },
                    leadQuality: { type: 'string', example: 'warm' },
                  },
                },
                campaign: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', example: 'AI Marketing Quiz' },
                    type: { type: 'string', example: 'quiz' },
                  },
                },
                processing: {
                  type: 'object',
                  properties: {
                    provider: { type: 'string', example: 'openai' },
                    model: { type: 'string', example: 'gpt-4' },
                    tokensUsed: { type: 'integer', example: 512 },
                    processingTime: { type: 'integer', example: 2340 },
                    completedAt: { type: 'string', format: 'date-time' },
                  },
                },
                metadata: {
                  type: 'object',
                  properties: {
                    resultLength: { type: 'integer', example: 1245 },
                    wordCount: { type: 'integer', example: 187 },
                  },
                },
              },
            },
          },
        },
        // System Schemas
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            timestamp: { type: 'string', format: 'date-time' },
            version: { type: 'string', example: '1.0.0' },
            environment: { type: 'string', example: 'production' },
            uptime: { type: 'number', example: 3600.5 },
          },
        },
        // Error Schemas
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                status: { type: 'integer', example: 400 },
                name: { type: 'string', example: 'ValidationError' },
                message: { type: 'string', example: 'Invalid input data' },
                details: { type: 'string', example: 'Email field is required' },
              },
            },
          },
        },
      },
      responses: {
        BadRequest: {
          description: 'Bad Request - Invalid input data',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        NotFound: {
          description: 'Not Found - Resource does not exist',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        Forbidden: {
          description: 'Forbidden - Access denied or resource unavailable',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        InternalServerError: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    tags: [
      {
        name: 'Campaigns',
        description: 'Campaign management and configuration endpoints',
      },
      {
        name: 'Leads',
        description: 'Lead submission and processing endpoints',
      },
      {
        name: 'System',
        description: 'System health and monitoring endpoints',
      },
    ],
  };
}

/**
 * Generate API documentation in Markdown format
 * @returns {string} Markdown documentation
 */
function generateMarkdownDoc() {
  return `# GoAIX Platform API Documentation

## Overview

The GoAIX Platform API provides endpoints for managing AI-powered lead generation campaigns at quiz.goaiex.com.

### Base URLs
- **Production**: \`https://api.quiz.goaiex.com\`
- **Development**: \`http://localhost:1337\`

### Authentication
Most endpoints are public and do not require authentication. Admin endpoints use JWT Bearer tokens.

## Frontend Integration Guide

### 1. Campaign Loading Flow

\`\`\`javascript
// Check if campaign exists and is available
const campaignInfo = await fetch('/api/campaigns/{slug}/info');

if (campaignInfo.data.isAvailable) {
  // Load full campaign data
  const campaign = await fetch('/api/campaigns/{slug}/public');
  // Render campaign form
}
\`\`\`

### 2. Lead Submission Flow

\`\`\`javascript
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
  const status = await fetch(\`/api/leads/\${leadId}/status\`);
  return status.data;
};

// Or use Server-Sent Events for real-time updates
const eventSource = new EventSource(\`/api/leads/\${leadId}/subscribe\`);
eventSource.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('Lead update:', update);
};
\`\`\`

### 3. Result Display

\`\`\`javascript
// Get formatted AI result
const result = await fetch(\`/api/leads/\${leadId}/result-formatted\`);

if (result.success) {
  // Display AI-generated content
  displayResult(result.data.content);
}
\`\`\`

## Error Handling

All endpoints return consistent error responses:

\`\`\`json
{
  "success": false,
  "error": {
    "status": 400,
    "name": "ValidationError",
    "message": "Invalid input data",
    "details": "Email field is required"
  }
}
\`\`\`

### Common Error Codes
- \`400\` - Bad Request (validation errors)
- \`403\` - Forbidden (campaign unavailable, capacity reached)
- \`404\` - Not Found (campaign/lead not found)
- \`429\` - Too Many Requests (rate limit exceeded)
- \`500\` - Internal Server Error

## Rate Limiting

- **Public endpoints**: 100 requests per minute per IP
- **SSE endpoints**: 20 connections per IP
- **Admin endpoints**: 200 requests per minute

## Campaign Types

### Quiz Campaigns
Configuration structure for quiz-type campaigns:
\`\`\`json
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
\`\`\`

### Chatbot Campaigns
\`\`\`json
{
  "type": "chatbot",
  "initialMessage": "Hello! How can I help?",
  "conversationFlow": {
    "maxMessages": 10,
    "collectEmail": true
  }
}
\`\`\`

## Webhooks (Future)

Webhook endpoints will be available for:
- Lead submission notifications
- AI processing completion
- Export status updates

## Support

For API support, contact: support@quiz.goaiex.com

## Changelog

### v1.0.0 (Current)
- Initial API release
- Campaign and lead management
- Real-time processing updates
- Google Sheets integration
`;
}

module.exports = {
  generateOpenAPISpec,
  generateMarkdownDoc,
};