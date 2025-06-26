# GoAIX - Technische Architektur

## 🏗️ Architektur-Übersicht

GoAIX folgt einer modernen, mikroservice-orientierten Architektur mit klarer Trennung von Verantwortlichkeiten und hoher Skalierbarkeit.

### High-Level-Architektur

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Admin Panel   │    │  External APIs  │
│   (React)       │    │   (Strapi)      │    │  (AI Providers) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
              ┌─────────────────────────────────┐
              │         API Gateway             │
              │        (Strapi API)             │
              └─────────────────────────────────┘
                                 │
              ┌─────────────────────────────────┐
              │      Business Logic Layer       │
              │    (Services & Controllers)     │
              └─────────────────────────────────┘
                                 │
      ┌────────────────┬─────────┼─────────┬────────────────┐
      │                │         │         │                │
┌───────────┐  ┌─────────────┐  │  ┌─────────────┐  ┌─────────────┐
│PostgreSQL │  │   Redis     │  │  │ Bull Queue  │  │Google Sheets│
│(Database) │  │ (Cache)     │  │  │ (Jobs)      │  │    API      │
└───────────┘  └─────────────┘  │  └─────────────┘  └─────────────┘
                                │
                    ┌─────────────────┐
                    │   AI Services   │
                    │ (Multi-Provider)│
                    └─────────────────┘
```

## 🎯 Architektur-Prinzipien

### 1. Separation of Concerns
- **API Layer**: Routing und Request-Handling
- **Business Logic**: Services für Geschäftslogik
- **Data Layer**: Repository-Pattern für Datenzugriff
- **External Integration**: Service-Layer für externe APIs

### 2. Scalability
- **Asynchrone Verarbeitung**: Bull Queue für zeitaufwändige Tasks
- **Caching-Strategy**: Redis für Performance-Optimierung
- **Microservice-Ready**: Modularer Aufbau für zukünftige Aufteilung

### 3. Maintainability
- **Clean Code**: Konsistente Coding-Standards
- **Documentation**: Comprehensive JSDoc-Dokumentation
- **Testing**: Unit- und Integration-Tests
- **Monitoring**: Strukturiertes Logging und Error-Tracking

## 📁 Projekt-Struktur Deep Dive

### /src/api/ - API-Schicht
```
/api/
├── /campaign/
│   ├── /controllers/     # Request-Handler und Response-Logik
│   ├── /routes/         # API-Route-Definitionen
│   ├── /services/       # Business-Logic für Campaigns
│   └── /content-types/  # Strapi Content-Type-Schema
└── /lead/
    ├── /controllers/    # Lead-Management-Logik
    ├── /routes/        # Lead-API-Routen
    ├── /services/      # Lead-Processing-Services
    └── /content-types/ # Lead-Schema-Definition
```

### /src/services/ - Business-Logic-Schicht
```
/services/
├── google-sheets.service.js     # Google Sheets API-Integration
├── ai-orchestrator.service.js   # AI-Provider-Management
├── queue.service.js            # Bull Queue-Management
├── email.service.js            # E-Mail-Versand-Service
└── /ai/                        # AI-Service-Module
    ├── /providers/             # AI-Provider-Implementierungen
    ├── prompt-engine.js        # Template-Processing
    └── response-processor.js   # AI-Response-Handling
```

### /src/utils/ - Utility-Schicht
```
/utils/
├── validators.js    # Input-Validierung (Joi-Schemas)
├── helpers.js      # Allgemeine Helper-Funktionen
├── constants.js    # Anwendungs-Konstanten
└── logger.js       # Winston-Logger-Konfiguration
```

## 🔄 Datenfluss-Architektur

### Campaign-Submission-Flow
```
1. Frontend → POST /api/campaigns/:slug/submit
2. Campaign Controller → Input-Validierung
3. Lead Service → Lead-Erstellung in Database
4. Queue Service → AI-Processing-Job einreihen
5. AI Orchestrator → Provider-Selection und Processing
6. Google Sheets Service → Asynchroner Export
7. Email Service → Result-E-Mail versenden
8. Response → Frontend mit Job-Status
```

### AI-Processing-Pipeline
```
1. Lead-Data + Campaign-Config → AI Orchestrator
2. Prompt Engine → Template-Processing
3. Provider Selection → Fallback-Strategy
4. AI Provider → API-Call mit Retry-Logic
5. Response Processor → Normalisierung
6. Cache Service → Result-Caching
7. Database → Result-Speicherung
```

## 💾 Datenmodell-Architektur

### Entity-Relationship-Diagram
```
┌─────────────────┐         ┌─────────────────┐
│    Campaign     │    1:N  │      Lead       │
├─────────────────┤◄────────├─────────────────┤
│ id (PK)         │         │ id (PK)         │
│ slug (UNIQUE)   │         │ campaignId (FK) │
│ title           │         │ firstName       │
│ campaignType    │         │ email           │
│ config (JSON)   │         │ responses (JSON)│
│ aiPromptTemplate│         │ aiResult        │
│ emailTemplate   │         │ googleSheetsExp.│
│ googleSheetId   │         │ createdAt       │
│ isActive        │         └─────────────────┘
│ createdAt       │
│ updatedAt       │
└─────────────────┘
```

### Campaign-Config-Schema (JSON)
```javascript
// Quiz-Type Config
{
  "type": "quiz",
  "questions": [
    {
      "id": "q1",
      "question": "Was ist dein größtes Challenge?",
      "type": "multiple-choice",
      "options": ["A", "B", "C", "D"],
      "required": true
    }
  ],
  "scoring": {
    "logic": "weighted",
    "weights": {"A": 10, "B": 7, "C": 5, "D": 3}
  }
}

// ChatBot-Type Config
{
  "type": "chatbot",
  "initialMessage": "Hallo! Wie kann ich dir helfen?",
  "conversationFlow": {
    "maxMessages": 10,
    "collectEmail": true,
    "aiModel": "gpt-4"
  }
}
```

## 🚀 Service-Architektur

### AI-Orchestrator-Pattern
```javascript
class AIOrchestrator {
  constructor() {
    this.providers = {
      'openai': new OpenAIProvider(),
      'claude': new ClaudeProvider(),
      'gemini': new GeminiProvider()
    };
    this.fallbackOrder = ['openai', 'claude', 'gemini'];
  }

  async processWithFallback(prompt, config) {
    // Provider-Selection mit Fallback-Strategy
    // Caching-Layer
    // Error-Handling und Retry-Logic
    // Token-Usage-Tracking
  }
}
```

### Queue-Service-Architecture
```javascript
class QueueService {
  queues = {
    'ai-processing': new Queue('ai-processing'),
    'email-sending': new Queue('email-sending'),
    'sheets-export': new Queue('sheets-export')
  };

  processors = {
    'ai-processing': this.processAIRequest,
    'email-sending': this.sendEmail,
    'sheets-export': this.exportToSheets
  };
}
```

## 🔒 Security-Architektur

### Authentication & Authorization
- **Admin-Panel**: Strapi-eigene Authentifizierung
- **API-Access**: JWT-basierte Authentifizierung
- **Rate-Limiting**: Express-Rate-Limit für DOS-Schutz
- **Input-Validation**: Joi-Schemas für alle Inputs

### Data Protection
- **Encryption**: Sensitive Daten verschlüsselt in Database
- **API-Keys**: Environment-basierte Key-Verwaltung
- **CORS**: Konfigurierte CORS-Policy
- **HTTPS**: SSL/TLS-Verschlüsselung obligatorisch

## 📊 Performance-Architektur

### Caching-Strategy
```
L1 Cache: Application-Level (Memory)
L2 Cache: Redis (Distributed)
L3 Cache: Database Query Cache
```

### Optimization-Patterns
- **Connection Pooling**: Database-Connection-Management
- **Lazy Loading**: On-Demand-Datenladung
- **Batch Processing**: Bulk-Operations für Performance
- **Async Processing**: Non-blocking Operations

## 🔍 Monitoring-Architektur

### Logging-Strategy
```javascript
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Metrics & Analytics
- **Request-Tracking**: API-Call-Metriken
- **Performance-Monitoring**: Response-Time-Tracking
- **Error-Tracking**: Structured Error-Logging
- **Business-Metrics**: Lead-Conversion-Tracking

## 🔄 Deployment-Architektur

### Container-Strategy
```dockerfile
# Multi-Stage-Build für Optimierung
FROM node:18-alpine AS builder
FROM node:18-alpine AS production
```

### Environment-Strategy
- **Development**: Local mit Docker Compose
- **Staging**: Cloud-basiert mit Monitoring
- **Production**: Load-Balanced mit Auto-Scaling

---

**Letzte Aktualisierung**: 26.06.2024
**Architektur-Version**: 1.0
**Review-Datum**: 03.07.2024