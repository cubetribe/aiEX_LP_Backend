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



📋 VOLLSTÄNDIGE PROJEKT-DOKUMENTATION

  GoAIX AI-Lead-Magnet Platform - Aktueller Stand (27.06.2025)

  ---
  🎯 PROJEKTSTATUS: PHASE 1 - CORE SYSTEM STABILISIERT

  ✅ ERFOLGREICH IMPLEMENTIERT:

  1. Deployment Infrastructure:

  - ✅ Railway Deployment - https://web-production-6df54.up.railway.app
  - ✅ PostgreSQL Database - Railway-managed
  - ✅ Docker Build - Node.js 20 (glibc, nicht Alpine)
  - ✅ SWC Compiler Fix - @swc/core-linux-x64-gnu installiert

  2. Core Strapi System:

  - ✅ Strapi v4.24.2 - läuft stabil
  - ✅ Admin Panel - vollständig funktional
  - ✅ User Management - User-Erstellung funktioniert
  - ✅ Media Library - File-Uploads funktionieren
  - ✅ Development Mode - Content-Type-Editing aktiviert

  3. Content-Types:

  - ✅ User (Standard Strapi)
  - ✅ Campaign (neu implementiert)
  {
    "title": "string (required)",
    "slug": "uid (auto-generated)",
    "description": "text",
    "campaignType": "enum[quiz,text,image,chatbot,custom]",
    "status": "enum[draft,active,paused,completed]",
    "isActive": "boolean",
    "leads": "relation oneToMany"
  }

  ---
  ❌ TEMPORÄR ENTFERNTE KOMPONENTEN:

  1. Content-Types & APIs (können wiederhergestellt werden):

  📁 ENTFERNT/BACKUP:
  ├── src/api/lead/                     # Lead Content-Type & API
  ├── src/api/ai-orchestrator/          # AI Services (OpenAI, Claude, Gemini)
  ├── src/api/campaign-processing/      # Campaign Processing Logic
  ├── src/api/google-sheets/            # Google Sheets Integration
  └── src/api/queue/                    # Queue System (Bull/Redis)

  2. Custom Services (in src/index.js auskommentiert):

  // DEAKTIVIERT:
  - Queue Service Initialization
  - AI Provider Validation
  - Google Sheets Service
  - Email Service
  - Health Check Service
  - Custom Routes Registration
  - Enhanced Lifecycle Hooks

  3. Environment Validation (bypassed):

  // src/index.js Line 34:
  const envReport = { isValid: true }; // Validation übersprungen

  4. Custom Middlewares (vereinfacht):

  // config/middlewares.js - NUR Standard Strapi:
  [
    'strapi::errors',
    'strapi::security',
    'strapi::cors',
    'strapi::poweredBy',
    'strapi::logger',
    'strapi::query',
    'strapi::body',
    'strapi::session',
    'strapi::favicon',
    'strapi::public'
  ]

  5. Plugin-Konfiguration:

  // config/plugins.js:
  documentation: { enabled: false }  // Wegen Content-Type-Konflikten

  ---
  🔧 KRITISCHE FIXES IMPLEMENTIERT:

  1. SWC Compiler Problem:

  # Dockerfile - Linux glibc statt Alpine musl:
  FROM node:20-slim
  RUN npm install @swc/core-linux-x64-gnu

  2. Build Arguments:

  ARG NODE_ENV=development
  ARG STRAPI_ADMIN_BACKEND_URL
  ARG DATABASE_URL

  3. Required Directories:

  RUN mkdir -p public public/uploads build .tmp
  RUN touch public/favicon.ico

  4. Environment Variables:

  # Railway Variables (aktuell):
  NODE_ENV=development
  DATABASE_URL=postgresql://postgres:avFnHLBUksTtEtOlinhpuCFfjrBmLWQQ@interchange.proxy.rlwy.net:59396/railway
  DATABASE_CLIENT=postgres
  STRAPI_ADMIN_BACKEND_URL=https://web-production-6df54.up.railway.app

  # API Keys (konfiguriert):
  OPENAI_API_KEY=sk-proj-pcfuqnMTeKR3hatoI_d7QoMu...
  ANTHROPIC_API_KEY=sk-ant-api03-fr62NbubD498Z2M9ojU9GA...
  GOOGLE_API_KEY=AIzaSyCKmnToIDYn_BSJasnmvkTriYWZXrpVXNs

  ---
  🚀 NÄCHSTE SCHRITTE - ROADMAP:

  PHASE 2: Content-Types Wiederherstellen

  1. ⏳ Lead Content-Type hinzufügen
  2. ⏳ API Permissions konfigurieren
  3. ⏳ Content-Relations testen

  PHASE 3: Services Reaktivieren

  4. ⏳ Environment Validation reparieren
  5. ⏳ AI Services (OpenAI, Claude, Gemini)
  6. ⏳ Queue System (Redis + Bull)
  7. ⏳ Google Sheets Integration

  PHASE 4: Production-Ready

  8. ⏳ Custom Middlewares (Rate-limiting, Security)
  9. ⏳ NODE_ENV=production setzen
  10. ⏳ Documentation Plugin reaktivieren
  11. ⏳ Custom Domains verbinden

  ---
  📁 BACKUP & WIEDERHERSTELLUNG:

  Gesicherte Komponenten:

  - Alle entfernten APIs sind wiederherstellbar
  - Original Environment Validation vorhanden
  - Custom Middleware-Konfiguration dokumentiert
  - AI Provider Integration vollständig

  Wiederherstellungsanleitung:

  # 1. Lead Content-Type:
  mkdir -p src/api/lead/content-types/lead
  # + Schema, Controller, Routes, Services erstellen

  # 2. AI Services:
  mkdir -p src/api/ai-orchestrator
  # + OpenAI, Claude, Gemini Provider wiederherstellen

  # 3. Services in src/index.js:
  # Auskommentierte Blöcke reaktivieren

  ---
  ⚠️ BEKANNTE PROBLEME:

  1. Documentation Plugin - Konflikte mit Custom Content-Types
  2. Build-Zeit - Länger durch Development Mode
  3. favicon.ico - 500 Fehler (unwichtig)
  4. Browser Extensions - Runtime-Errors (unwichtig)

  ---
  🔗 WICHTIGE LINKS:

  - Admin Panel: https://web-production-6df54.up.railway.app/admin
  - API Base: https://web-production-6df54.up.railway.app
  - Railway Dashboard: [Railway Project]
  - Database: PostgreSQL (Railway-managed)

  ---
  Stand: 27.06.2025 - System läuft stabil, Ready für Phase 2 ✅