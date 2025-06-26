# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**GoAIX** - AI-Lead-Magnet-Plattform deployed at quiz.goaiex.com
- **Frontend URL**: https://quiz.goaiex.com
- **API URL**: https://api.quiz.goaiex.com  
- **Admin Panel**: https://admin.quiz.goaiex.com
- **Campaign URLs**: quiz.goaiex.com/campaign/[slug]

## Technology Stack

- **Backend**: Strapi v4 (Headless CMS + API)
- **Database**: PostgreSQL
- **Cache/Queue**: Redis + Bull Queue
- **AI Providers**: OpenAI, Claude, Google Gemini (multi-provider support)
- **Integrations**: Google Sheets API, Email (SMTP)

## Development Commands

```bash
# Install dependencies
npm install

# Development server (with admin panel)
npm run develop

# Production build
npm run build

# Start production server
npm start

# Run tests
npm test

# Linting and formatting
npm run lint
npm run format

# Database operations
npm run strapi:migrate
npm run strapi:seed
```

## Project Structure

```
Code/
├── config/                    # Strapi configuration
│   ├── database.js           # PostgreSQL setup
│   ├── server.js             # Server + CORS for quiz.goaiex.com
│   ├── admin.js              # Admin panel configuration
│   └── middlewares.js        # Security, CORS, rate limiting
├── src/
│   ├── api/
│   │   ├── campaign/         # Campaign management API
│   │   │   ├── controllers/  # API request handlers
│   │   │   ├── routes/       # API route definitions
│   │   │   ├── services/     # Business logic
│   │   │   └── content-types/ # Data model schemas
│   │   └── lead/             # Lead processing API
│   │       ├── controllers/  # Lead submission & processing
│   │       ├── routes/       # Lead API routes
│   │       ├── services/     # Lead scoring & management
│   │       └── content-types/ # Lead data model
│   ├── services/             # Core business services
│   │   ├── ai/               # AI provider integrations
│   │   ├── google-sheets.service.js
│   │   ├── queue.service.js  # Bull Queue management
│   │   └── email.service.js  # Email notifications
│   ├── utils/                # Utilities and helpers
│   ├── middlewares/          # Custom middleware
│   └── index.js              # Application entry point
└── tests/                    # Test files
```

## Core Data Models

### Campaign
- **slug**: Unique URL identifier (e.g., "leadmagnet-quiz")
- **campaignType**: quiz, imageUpload, chatbot, textOnly, custom
- **config**: JSON configuration for campaign behavior
- **aiPromptTemplate**: Template for AI processing
- **googleSheetId**: Optional Google Sheets export target

### Lead  
- **campaign**: Reference to campaign
- **firstName/email**: Contact information
- **responses**: JSON with user answers/data
- **aiResult**: Generated AI content
- **aiProcessingStatus**: pending, processing, completed, failed
- **leadScore**: 0-100 calculated score
- **leadQuality**: hot, warm, cold, unqualified

## Key API Endpoints

```bash
# Public Campaign APIs
GET /api/campaigns/:slug              # Get campaign details
POST /api/campaigns/:slug/submit      # Submit lead to campaign
GET /api/campaigns/:slug/leads/:id/status  # Check processing status

# Lead Management (Admin)
GET /api/leads                        # List all leads
GET /api/leads/:id/result            # Get AI-generated result
POST /api/leads/:id/reprocess        # Retry AI processing
GET /api/leads/stats                 # Lead statistics

# Health & Monitoring
GET /health                          # System health check
```

## Environment Configuration

Key environment variables (see .env.example):
- **STRAPI_URL**: https://api.quiz.goaiex.com
- **CORS_ORIGINS**: quiz.goaiex.com domains
- **DATABASE_**: PostgreSQL connection
- **REDIS_**: Redis configuration
- **OPENAI_API_KEY**, **CLAUDE_API_KEY**, **GEMINI_API_KEY**: AI providers
- **GOOGLE_SERVICE_ACCOUNT_PATH**: For Sheets integration

## Campaign Types & Configuration

### Quiz Campaigns
```javascript
{
  "type": "quiz",
  "questions": [
    {
      "id": "q1",
      "question": "What's your biggest challenge?", 
      "type": "multiple-choice",
      "options": ["A", "B", "C", "D"]
    }
  ],
  "scoring": { "logic": "weighted", "weights": {...} }
}
```

### Chatbot Campaigns
```javascript
{
  "type": "chatbot",
  "initialMessage": "Hello! How can I help?",
  "conversationFlow": {
    "maxMessages": 10,
    "collectEmail": true
  }
}
```

## AI Processing Flow

1. **Lead Submission** → Campaign validates & creates lead
2. **Queue Job** → AI processing queued with Bull
3. **AI Orchestrator** → Selects provider (OpenAI/Claude/Gemini)
4. **Template Processing** → Fills prompt template with lead data
5. **AI Generation** → Calls AI API with retry logic
6. **Result Storage** → Saves result to database
7. **Export & Email** → Google Sheets export + email notification

## Google Sheets Integration

- Service Account authentication required
- Automatic lead export to configured spreadsheet
- Asynchronous processing via queue system
- Retry logic for failed exports
- Row tracking for updates

## Development Workflow

1. **Local Setup**: Copy .env.example → .env with local values
2. **Database**: Create PostgreSQL database, run migrations
3. **Redis**: Start Redis server for caching/queues
4. **Development**: `npm run develop` starts dev server with admin
5. **Testing**: Create test campaigns via admin panel
6. **API Testing**: Use campaign slugs to test lead submission

## Deployment Notes

- **Production URL**: quiz.goaiex.com (frontend) + api.quiz.goaiex.com (backend)
- **CORS**: Configured for quiz.goaiex.com domains
- **SSL**: Required for production (webhook/API integrations)
- **Environment**: Use production environment variables
- **Monitoring**: Health checks, error tracking, performance monitoring

## Common Tasks

- **Add Campaign Type**: Extend campaignType enum + validation logic
- **Modify AI Prompts**: Update aiPromptTemplate in campaign config
- **Add Lead Fields**: Extend lead content-type schema
- **Custom Scoring**: Modify lead.service.js calculateLeadScore()
- **New Integrations**: Add services in src/services/

## Testing

- **Unit Tests**: `npm run test:unit`
- **Integration Tests**: `npm run test:integration` 
- **API Testing**: Use Postman/Insomnia with test campaigns
- **Campaign Testing**: Create test campaigns with different types

---

**Last Updated**: 2024-06-26  
**Version**: 0.1.0  
**Platform**: quiz.goaiex.com