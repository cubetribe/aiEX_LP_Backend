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
│   │   ├── email.service.js  # Email notifications
│   │   └── email-template.service.js # Enhanced email templates
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
- **emailTemplate**: Custom email template for results
- **emailSubject**: Email subject line template
- **resultDeliveryMode**: show_only, email_only, show_and_email

### Lead  
- **campaign**: Reference to campaign
- **firstName/email**: Contact information
- **responses**: JSON with user answers/data
- **aiResult**: Generated AI content
- **aiProcessingStatus**: pending, processing, completed, failed
- **leadScore**: 0-100 calculated score
- **leadQuality**: hot, warm, cold, unqualified
- **emailSent**: Boolean if result email was sent
- **emailSentAt**: Timestamp of email sending

## Key API Endpoints

```bash
# Public Campaign APIs
GET /api/campaigns/:slug              # Get campaign details
POST /api/campaigns/:slug/submit      # Submit lead to campaign
GET /api/campaigns/:slug/leads/:id/status  # Check processing status

# Lead Management (Admin)
GET /api/leads                        # List all leads
GET /api/leads/:id/result            # Get AI-generated result
POST /api/leads/:id/reprocess        # Retry AI processing with optional email
GET /api/leads/stats                 # Lead statistics

# Email System
POST /email/test                     # Send test email
GET /email/status                    # Check email service status
POST /email/reinit                   # Reinitialize email service

# Health & Monitoring
GET /debug/logs                      # Debug logs
GET /debug/campaigns                 # Campaign debug info
```

## Environment Configuration

Key environment variables (see .env.example):
- **STRAPI_URL**: https://api.quiz.goaiex.com
- **CORS_ORIGINS**: quiz.goaiex.com domains
- **DATABASE_**: PostgreSQL connection
- **REDIS_**: Redis configuration
- **OPENAI_API_KEY**, **ANTHROPIC_API_KEY**, **GOOGLE_API_KEY**: AI providers

### Email Configuration (All-Inkl.com)
- **EMAIL_PROVIDER**: smtp
- **SMTP_HOST**: w0204187.kasserver.com
- **SMTP_PORT**: 465 (SSL/TLS)
- **SMTP_SECURE**: true
- **SMTP_USERNAME**: mail@goaiex.com
- **SMTP_PASSWORD**: [CONFIGURED]

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
      "options": ["A", "B", "C", "D"],
      "showIf": {
        "field": "q0",
        "operator": "equals",
        "value": "business"
      }
    }
  ],
  "scoring": { 
    "logic": "conditional",
    "rules": [
      {
        "if": { "type": "Unternehmer" },
        "then": { "leadScore": 80, "leadQuality": "hot" }
      }
    ]
  }
}
```

## AI Processing Flow

1. **Lead Submission** → Campaign validates & creates lead
2. **AI Generation** → Real AI integration with fallback to templates
3. **Lead Scoring** → Conditional scoring based on campaign rules
4. **Email Processing** → Quality-based email templates (Hot/Warm/Cold)
5. **Result Delivery** → Show on screen and/or send email
6. **Tracking** → Email sent status and timestamps

## Email System Architecture

### Email Service (src/services/email.service.js)
- Nodemailer integration with All-Inkl.com SMTP
- Debug logging and environment validation
- Connection verification with fallback logic
- Test email functionality

### Email Template Service (src/services/email-template.service.js)
- Quality-based templates (Hot/Warm/Cold/Default)
- HTML email generation with styling
- Template variable processing
- Campaign-specific customization

### Email Templates by Lead Quality
- **Hot Leads**: Premium messaging, direct expert access
- **Warm Leads**: Professional recommendations, consultation offers
- **Cold Leads**: Educational content, basic resources
- **Default**: Generic friendly response

## Development Workflow

1. **Local Setup**: Copy .env.example → .env with local values
2. **Database**: Create PostgreSQL database, run migrations
3. **Email**: Configure All-Inkl.com SMTP settings
4. **Development**: `npm run develop` starts dev server with admin
5. **Testing**: Create test campaigns via admin panel
6. **API Testing**: Use campaign slugs to test lead submission

## Deployment Notes

- **Production URL**: Railway - https://web-production-6df54.up.railway.app
- **Frontend URL**: Vercel - https://aiex-quiz-platform-519nmqcf0-cubetribes-projects.vercel.app
- **CORS**: Configured for .vercel.app and goaiex.com domains
- **SSL**: Required for production (webhook/API integrations)
- **Environment**: All environment variables configured in Railway
- **Email**: Fully functional with All-Inkl.com SMTP

## Testing

- **Email Testing**: POST /email/test with recipient, subject, content
- **Lead Processing**: Submit leads via campaign routes
- **AI Generation**: Test with real AI providers or fallback templates
- **Campaign Testing**: Create test campaigns with different types

---

===================================================================

📋 VOLLSTÄNDIGE PROJEKT-DOKUMENTATION - AKTUELLER STAND

GoAIX AI-Lead-Magnet Platform - Projekt Status (28.06.2025)

---
🎯 PROJEKTSTATUS: PHASE 2 KOMPLETT ABGESCHLOSSEN ✅

✅ PHASE 1 - CORE SYSTEM STABILISIERT:

1. Mock Data Elimination:
- ✅ Vollständige Projektstruktur durchsucht (18 Mock-Data Instanzen gefunden)
- ✅ Hardcodierte AI-Antworten entfernt
- ✅ Fake User Profiles durch Template-Variablen ersetzt
- ✅ Debug-Routen bereinigt
- ✅ Sample Data in AI Provider Service neutralisiert

2. AI Processing Pipeline:
- ✅ OpenAI, Anthropic, Google Gemini Provider alle aktiv
- ✅ End-to-End AI-Generierung ohne Mock-Data validiert
- ✅ Template-basierte Fallback-Systeme implementiert
- ✅ Enhanced AI Integration mit Real AI + Fallback

3. Responses Storage System:
- ✅ Lead API Response-Struktur repariert
- ✅ Vollständige Lead-Daten (id, email, responses) in API
- ✅ Database Storage funktional
- ✅ FormattedResult API-Format standardisiert

---
🚀 PHASE 2 - EMAIL SYSTEM KOMPLETT IMPLEMENTIERT:

1. SMTP Configuration (All-Inkl.com):
- ✅ Environment Variables: EMAIL_PROVIDER=smtp
- ✅ SMTP Settings: w0204187.kasserver.com:465 (SSL)
- ✅ Authentication: mail@goaiex.com + Password
- ✅ Nodemailer Integration: createTransport API
- ✅ Connection Verification mit Fallback Logic

2. Email Templates & Campaign Integration:
- ✅ Quality-basierte Templates (Hot/Warm/Cold/Default)
- ✅ HTML Email-Styling mit Lead-Quality Colors
- ✅ Campaign Email Configuration System
- ✅ Template Variable Processing ({{firstName}}, {{aiResult}}, etc.)
- ✅ Email Template Service (src/services/email-template.service.js)

3. Automatische Email-Versendung:
- ✅ Lead Service Email Integration
- ✅ Result Delivery basierend auf Campaign Configuration
- ✅ Email Tracking (emailSent, emailSentAt)
- ✅ Manual Lead Reprocessing mit Email Option
- ✅ Enhanced Email Content Preparation

4. Email System Testing:
- ✅ Test Email Route: POST /email/test
- ✅ Email Status Route: GET /email/status mit Debug Info
- ✅ Manual Reinitialization: POST /email/reinit
- ✅ ERFOLGREICHE TEST-EMAIL an info@cubetribe.de
- ✅ Message ID: <1a209d1a-c856-fbac-00cb-dae9ab110597@goaiex.com>

---
🔧 KRITISCHE FIXES IMPLEMENTIERT:

1. All-Inkl.com SMTP Research & Konfiguration:
- ✅ Web-Research für korrekte SMTP-Einstellungen
- ✅ Port 465 (statt 587) für SSL-Verschlüsselung
- ✅ secure: true für All-Inkl.com Compliance
- ✅ Railway Environment Variables Update

2. Nodemailer API Korrektur:
- ✅ createTransport (nicht createTransporter)
- ✅ Transporter Creation Debug Logging
- ✅ Error Handling und Fallback Logic

3. Email Service Debug System:
- ✅ Comprehensive Debug Info Array
- ✅ Environment Variable Validation
- ✅ Step-by-Step Initialization Logging
- ✅ Status API mit Debug Information

---
📊 DEPLOYMENT STATUS:

✅ Backend (Railway):
- URL: https://web-production-6df54.up.railway.app
- Database: PostgreSQL (Railway-managed)
- Email Service: Vollständig funktional
- AI Services: OpenAI, Anthropic, Google Gemini aktiv

✅ Frontend (Vercel):
- URL: https://aiex-quiz-platform-519nmqcf0-cubetribes-projects.vercel.app
- Test Quiz: /campaign/test-quiz
- Mock Data: Optional aktivierbar
- API Integration: Vollständig funktional

✅ Git Repository:
- Commits: Systematische Feature-Implementierung
- Branches: Master Branch produktionsreif
- Documentation: CLAUDE.md vollständig
- Code Quality: Keine Mock-Data, Production-Ready

---
🎯 SYSTEM FEATURES - KOMPLETT IMPLEMENTIERT:

1. Campaign Management:
- ✅ Multiple Campaign Types (Quiz, Text, Image, Chatbot)
- ✅ Conditional Logic für dynamische Fragen
- ✅ JSON Code Override für Bot-generierte Configs
- ✅ Preview URL Generation
- ✅ Campaign Status Management

2. Lead Processing:
- ✅ Enhanced Lead Scoring mit Conditional Rules
- ✅ Intelligent Privat vs. Gewerblich Detection
- ✅ Lead Quality Classification (Hot/Warm/Cold)
- ✅ Real AI Integration mit Template Fallback
- ✅ Lead Reprocessing System

3. Email Integration:
- ✅ Automatische Result Email Delivery
- ✅ Quality-basierte Email Templates
- ✅ HTML Styling mit Lead-Quality Colors
- ✅ Campaign-specific Email Configuration
- ✅ Email Tracking und Status Management

4. API System:
- ✅ Public Campaign Routes (/campaigns/public/:slug)
- ✅ Lead Submission (/campaigns/:slug/submit)
- ✅ Result Retrieval (/leads/:id/result)
- ✅ Lead Reprocessing (/leads/:id/reprocess)
- ✅ Email Testing (/email/test, /email/status)

---
⏳ PENDING FEATURES (Optional):

1. Queue System für automatische AI-Verarbeitung:
- Redis + Bull Queue Integration
- Background Job Processing
- Retry Logic für failed AI Requests
- Performance Optimierung

2. Advanced Features:
- Google Sheets Export Integration
- Webhook System für externe Integrationen
- Advanced Analytics und Reporting
- Multi-language Support

---
📈 PROJEKTMETRIKEN:

🚀 Code Changes:
- 25+ Git Commits mit systematischer Entwicklung
- 3 neue Services implementiert (Email, Email-Template, Enhanced Lead)
- 15+ neue API Routes
- 100% Mock-Data eliminiert

📧 Email System:
- 4 Quality-basierte Templates implementiert
- HTML Email-Styling mit CSS
- All-Inkl.com SMTP Integration (Port 465 + SSL)
- Test-Email erfolgreich versendet ✅

🤖 AI Integration:
- 3 AI Provider aktiv (OpenAI, Claude, Gemini)
- Template Fallback System
- Enhanced Scoring Algorithm
- Real AI + Template Hybrid System

---
🎉 PROJEKT STATUS: PRODUKTIONSREIF FÜR INVESTOR-PRÄSENTATIONEN

✅ ALLE KERN-FEATURES IMPLEMENTIERT
✅ EMAIL-SYSTEM VOLLSTÄNDIG FUNKTIONAL  
✅ AI-PIPELINE OHNE MOCK-DATA
✅ FRONTEND-BACKEND INTEGRATION KOMPLETT
✅ DEPLOYMENT AUF RAILWAY + VERCEL ERFOLGREICH

Das GoAIX System ist jetzt ein vollständiges, produktionsreifes AI-Lead-Magnet-System ohne Mock-Data mit funktionalem Email-Versand!

---
Stand: 28.06.2025 02:30 CET - PHASE 2 ERFOLGREICH ABGESCHLOSSEN! 🎉📧✅