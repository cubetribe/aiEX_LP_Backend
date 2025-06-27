# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Geplant
- Email-Integration mit Nodemailer
- Advanced Analytics Dashboard
- Multi-Language Support
- Webhook-Integration für Third-Party-Services

## [0.4.0] - 2025-06-27 - CONDITIONAL LOGIC MAJOR RELEASE 🚀

### 🎯 Hinzugefügt - Conditional Logic System

#### Frontend Conditional Logic Engine
- **Dynamic Question Routing**: Fragen erscheinen/verschwinden basierend auf vorherigen Antworten
- **Operators Support**: `equals`, `not_equals`, `in`, `not_in` für flexible Bedingungslogik
- **Real-time Updates**: Fragensichtbarkeit wird nach jeder Antwort neu berechnet
- **TypeScript Types**: Neue `ConditionalRule` und erweiterte `QuizQuestion` Interfaces
- **Privat vs. Gewerblich Flow**: Intelligente Weiterleitung basierend auf Benutzertyp

#### AI Model Management System
- **10 aktuelle AI-Modelle** mit provider-spezifischer Auswahl
- **Deutsche Beschreibungen** für jedes Modell mit Anwendungsempfehlungen
- **Auto-Validierung** zwischen AI-Modell und Provider-Auswahl
- **Kosten/Performance-Transparenz** in der Modellauswahl

**Verfügbare Modelle:**
```
OpenAI:
- gpt-4.5 (komplexe Aufgaben & Kreativität)
- gpt-4.1 (Coding & Business-Analyse)
- gpt-4o (schnell, günstig, multimodal)
- gpt-4o-mini (Standard-Chats)
- gpt-4-turbo (Performance + großer Kontext)
- gpt-3.5-turbo (einfache Aufgaben)

Anthropic:
- claude-opus-3.7 (tiefes Reasoning)
- claude-sonnet-3.7 (präzise Sprache)

Google:
- gemini-2.5-pro (multimodal + Web)
- gemini-2.5-flash (schnell + leichtgewichtig)
```

#### Campaign Preview System
- **Auto-generierte Preview-URLs** für jede Kampagne
- **Live Preview Button** im Admin Panel
- **URL kopieren Funktionalität** für einfaches Teilen
- **Lifecycle Hooks** aktualisieren URLs automatisch bei Slug-Änderungen

#### Bot Integration Infrastructure
- **jsonCode Field** (50.000 Zeichen) für bot-generierte Konfigurationen
- **Auto-Merge Logik** kombiniert jsonCode mit bestehender Config
- **Override-Fähigkeit** - jsonCode hat Vorrang vor UI-Config
- **Error Handling** für ungültiges JSON mit Fallback zur UI-Config

**Bot-Integration Workflow:**
1. ChatBot generiert komplettes Quiz-JSON
2. User fügt JSON in jsonCode Field ein
3. System merged automatisch mit bestehender Konfiguration
4. Conditional Logic funktioniert sofort

#### Complete Lead Management System
- **Neuer Lead Content-Type** mit umfassendem Schema
- **Enhanced Scoring Engine** mit Support für conditional rules
- **Intelligente Privat vs. Gewerblich Logik**
- **Duale API-Routen** für maximale Frontend-Kompatibilität

**Scoring-Logik:**
- **Unternehmer 200+ Mitarbeiter**: 95 Punkte (hot lead)
- **Unternehmer 1-10 Mitarbeiter**: 60 Punkte (warm lead)
- **Privatperson Über 100k**: 50 Punkte (warm lead)
- **Privatperson Standard**: 35 Punkte (cold lead)

### 🔧 Technische Verbesserungen

#### Database Schema Änderungen
```json
// Campaign Content-Type Erweiterungen
{
  "jsonCode": "text(50000)", // Bot-generierte Konfigurationen
  "previewUrl": "string(500)", // Auto-generierte Preview-Links
  "aiModel": "enum[gpt-4.5, claude-opus-3.7, ...]" // Erweiterte Modell-Liste
}

// Neuer Lead Content-Type
{
  "firstName": "string(100)",
  "email": "email(255)",
  "responses": "json",
  "leadScore": "integer(0-100)",
  "leadQuality": "enum[hot,warm,cold,unqualified]",
  "aiProcessingStatus": "enum[pending,processing,completed,failed]",
  "aiResult": "text(10000)",
  "gdprConsent": "boolean",
  "campaign": "relation(manyToOne)"
}
```

#### Enhanced API Routes
- **Campaign Loading**: Erweiterte `/campaigns/public/:slug` mit jsonCode Support
- **Lead Submission**: Sowohl `/campaigns/:slug/submit` ALS AUCH `/campaigns/:id/submit`
- **Setup Route**: Erweiterte `/setup-campaign/:slug` mit Conditional Logic Beispiel

### 🐛 Behoben

#### Railway Deployment Issues
- **npm ci Fehler behoben** mit Node.js Version Mismatch (lokal v24 vs Railway v20)
- **Gewechselt zu npm install** für bessere Kompatibilität zwischen Node-Versionen
- **Dockerfile aktualisiert** mit explizitem `--production=false` Flag

#### CORS und API-Kompatibilität
- **Duale Lead Submission Routen** - Frontend nutzt Campaign-ID, Backend erwartet beide
- **Erweiterte CORS Headers** - Manuelle Headers für Vercel Deployment-Kompatibilität
- **API Response Standardisierung** - Konsistente Error/Success Response-Formate

### 📋 Geänderte Dateien

**Neue Dateien (8):**
```
src/api/lead/content-types/lead/schema.json
src/api/lead/services/lead.js
src/utils/ai-model-validation.js
src/api/campaign/content-types/campaign/lifecycles.js
src/admin/app.js
src/admin/extensions/campaign-preview-field.js
CHANGELOG.md (diese Datei)
```

**Geänderte Dateien (6):**
```
src/api/campaign/content-types/campaign/schema.json - jsonCode + previewUrl + aiModel enum
src/routes/index.js - Erweiterte Routen + conditional Beispiel + lead submission
Frontend-Deploy/components/campaign/quiz-campaign.tsx - Conditional Logic Engine
Frontend-Deploy/lib/types.ts - ConditionalRule Interface
Dockerfile - npm install Kompatibilitäts-Fix
CLAUDE.md - Komplette Dokumentations-Aktualisierung
```

### 🎯 Business Impact

Dieses Release transformiert die Plattform von einem einfachen Quiz-Tool zu einer **anspruchsvollen Conditional Logic Engine** mit folgenden Möglichkeiten:

- **Dynamische User Journeys** basierend auf individuellen Antworten
- **Intelligente Lead-Qualifizierung** mit business-spezifischer Bewertung
- **Bot-generierte Kampagnen** Support für schnelle Deployment
- **Professionelle AI-Modell-Auswahl** mit Kosten-Transparenz
- **Streamlined Campaign-Testing** mit sofortiger Preview-Funktionalität

Das System ist nun bereit für **produktions-skalierte Lead-Generierung** mit **enterprise-level conditional logic capabilities**.

### 🚀 Deployment Information

**Git Commits:**
- `c6a2ce8` - MASSIVE UPDATE: Complete Conditional Logic + Lead Infrastructure
- `66ccf32` - Fix Railway npm ci error (Node.js compatibility)

**URLs:**
- Frontend: https://aiex-quiz-platform-519nmqcf0-cubetribes-projects.vercel.app
- Backend: https://web-production-6df54.up.railway.app
- Test Quiz: /campaign/test-quiz

## [0.3.0] - 2024-06-26

### Hinzugefügt - AI-Integration Framework (Phase 3)

- **Multi-Provider AI-System**: Vollständige Implementierung eines modularen AI-Provider-Systems
  - **BaseAIProvider Abstract Class**: Standardisiertes Interface für alle AI-Provider
    - Einheitliche Methoden: `generateText()`, `generateStructured()`, `analyzeImage()`
    - Error-Handling-Standards mit Retry-Logic und exponential backoff
    - Response-Normalisierung und Validation für konsistente API-Responses
    - Token-Usage-Tracking und Cost-Monitoring für alle Provider
    - Rate-Limiting-Handling mit individuellen Provider-Limits
    - Health-Check-Funktionalität für Service-Monitoring

  - **OpenAI Provider**: Umfassende GPT-4o Integration
    - Support für GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-4, GPT-3.5-turbo
    - Vision-API-Integration für Multimodal-Support (Images)
    - Structured Output mit JSON Schema für konsistente Datenformate
    - Präzise Cost-Calculation basierend auf aktuellen Model-Preisen
    - OpenAI-spezifisches Error-Handling (quota, rate limits, etc.)
    - Organization-ID Support für Enterprise-Accounts

  - **Claude Provider**: Intelligente Anthropic Claude Integration
    - Support für Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
    - Intelligente Model-Selection basierend auf Request-Charakteristika
    - Advanced Vision-API für komplexe Image-Analysis
    - Structured Output mit intelligenter Prompt-Engineering
    - Separate Input/Output-Token-Pricing für akkurate Kostenberechnung
    - Model-Selector mit Complexity-Assessment und Performance-Optimization

  - **Gemini Provider**: Multi-Modal Google AI Integration
    - Support für Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 1.5 Flash-8B
    - Erweiterte Multi-Modal-Capabilities (Images, Video, Audio)
    - Structured Output mit Response-Schema-Validation
    - Umfassende Safety-Settings-Konfiguration
    - Large Context Window Support (bis zu 2M tokens)
    - Video- und Audio-Analysis für erweiterte Content-Verarbeitung

- **AI Orchestrator**: Intelligente Provider-Orchestrierung
  - Smart Provider-Selection basierend auf Request-Typ und Charakteristika
  - Load-Balancing zwischen verfügbaren Providern
  - Cost-Optimization-Algorithmen für budgetbewusste AI-Nutzung
  - Robuste Fallback-Mechanismen bei Provider-Fehlern
  - Multi-Layer Response-Caching mit Redis-Integration
  - Umfassendes Metrics-Tracking für Performance-Monitoring
  - Konfigurierbare Provider-Prioritäten und Failover-Chains

- **Prompt Template Engine**: Handlebars-basiertes Template-System
  - Campaign-Type-spezifische Template-Bibliothek
  - Dynamische Variable-Substitution und Context-Building
  - Support für Quiz, Image, Chatbot, Text-Only Kampagnen
  - Automated Email-Content-Generation mit personalisierten Templates
  - Template-Helpers für komplexe Datenformatierung
  - Context-Enhancement basierend auf Kampagnentyp und Lead-Daten

- **Campaign Processing Service**: Vollständige Lead-AI-Pipeline
  - Multi-Stage-Processing: Analysis → Response → Email → Validation
  - Intelligente Retry-Logic und Error-Recovery-Mechanismen
  - Real-time Status-Tracking mit granularen Progress-Updates
  - Automated Quality-Validation und Content-Scoring
  - Follow-up Task-Queueing für Google Sheets und Email-Delivery
  - Performance-Metriken für jeden Processing-Stage

- **Erweiterte API-Endpoints**: AI-Management und Monitoring
  - `POST /api/leads/:id/process-ai`: Direkte AI-Verarbeitung mit Provider-Auswahl
  - `GET /api/leads/ai-analytics`: Comprehensive AI-Performance-Analytics
  - `POST /api/leads/ai-providers/manage`: Provider-Management (validate, cache, metrics)
  - `POST /api/leads/bulk-process`: Bulk-AI-Processing für große Lead-Mengen
  - Enhanced Status- und Result-Endpoints mit detaillierten Metadaten

- **Performance-Monitoring und Caching**:
  - **Performance-Monitor**: Umfassendes System-Health-Monitoring
    - AI-Service-Performance-Tracking mit Response-Time-Analytics
    - Cost-Tracking und Budget-Alert-System
    - System-Resource-Monitoring (Memory, CPU, Uptime)
    - Automated Performance-Report-Generation
    - Threshold-basierte Alert-Mechanismen

  - **Cache-Manager**: Multi-Layer-Caching-System
    - AI-Response-Caching mit intelligenten Cache-Keys
    - Campaign-Data-Caching für Performance-Optimization
    - API-Response-Caching mit konfigurierbaren TTL-Werten
    - Redis-Integration für Distributed-Caching
    - Compression und Encryption für sicheres Caching
    - Cache-Invalidation-Patterns für konsistente Daten

### Verbessert
- **Lead Controller**: Erweiterte AI-Management-Funktionalität
- **Environment Configuration**: Umfassende AI-Provider-Konfiguration
- **Error Handling**: Provider-spezifische Error-Normalisierung
- **Logging**: Detailliertes AI-Processing-Logging mit Performance-Metriken

### Performance
- **Multi-Provider-Load-Balancing**: Optimale Provider-Auslastung
- **Intelligent Caching**: Reduzierte AI-API-Calls durch Smart-Caching
- **Asynchrone Processing-Pipeline**: Verbesserte Throughput-Performance
- **Memory-optimierte Caching**: Efficient Memory-Usage mit automatischer Cleanup

## [0.2.0] - 2024-06-26

### Hinzugefügt - Google Sheets Integration & Queue System
- **Google Sheets Service**: Vollständige Integration mit Google Sheets API
  - Service Account Authentication
  - Automatische Spreadsheet-Erstellung für Kampagnen
  - Dynamische Header-Generierung basierend auf Kampagnentyp
  - Lead-Export mit Batch-Processing
  - Retry-Logic mit exponential backoff
  - Umfassendes Error-Handling für API-Limits

- **Bull Queue System**: Asynchrone Job-Verarbeitung mit Redis
  - AI-Processing-Queue für Lead-Auswertung
  - Google Sheets Export-Queue
  - E-Mail-Versand-Queue
  - Analytics-Tracking-Queue
  - Job-Status-Tracking und Monitoring
  - Dead Letter Queue für fehlgeschlagene Jobs
  - Bull Board Dashboard für Development

- **Frontend-optimierte API-Endpoints**:
  - `GET /api/campaigns/{slug}/public` - Vollständige Kampagnendaten für Frontend
  - `GET /api/campaigns/{slug}/info` - Leichtgewichtige Kampagnen-Info
  - `POST /api/campaigns/{slug}/validate` - Kampagnen-Validierung
  - `POST /api/leads/submit` - Optimierter Lead-Submission-Endpoint
  - `GET /api/leads/{id}/status` - Lead-Processing-Status
  - `GET /api/leads/{id}/result-formatted` - Formatierte AI-Ergebnisse
  - `GET /api/leads/{id}/subscribe` - Server-Sent Events für Real-time Updates

- **Lifecycle Hooks**: Automatisierte Datenverarbeitung
  - Automatische Queue-Job-Erstellung nach Lead-Submission
  - Campaign-Update-Hooks für Google Sheets Konfiguration
  - Retry-Logic für fehlgeschlagene AI-Verarbeitung
  - Analytics-Event-Tracking

- **Environment Variables Validation**:
  - Umfassende Startup-Validierung mit Joi
  - AI-Provider-Konfiguration-Checks
  - Google Sheets Authentifizierung-Validation
  - Production-Security-Requirements
  - Detaillierte Validation-Reports

- **API-Dokumentation**:
  - OpenAPI 3.0 Specification
  - Vollständige Markdown-Dokumentation
  - Frontend-Integration-Guide mit React/Vue.js Beispielen
  - Error-Handling-Dokumentation
  - Rate-Limiting-Information

### Verbessert
- **Campaign Controller**: Frontend-optimierte Endpoints mit Caching
- **Lead Controller**: Server-Sent Events für Real-time Updates
- **Error-Handling**: Konsistente Error-Responses für alle Endpoints
- **CORS-Konfiguration**: Spezifisch für quiz.goaiex.com Domains
- **Security**: Rate-Limiting und Request-Validation

### Domain-Integration
- **quiz.goaiex.com Konfiguration**:
  - Frontend-URL: https://quiz.goaiex.com
  - Backend-URL: https://api.quiz.goaiex.com
  - Admin-URL: https://admin.quiz.goaiex.com
  - CORS für alle quiz.goaiex.com Subdomains
  - SSL/TLS-Konfiguration für Production

### Performance
- **Caching-Strategy**: Redis-basiertes Caching für Campaign-Daten
- **Queue-System**: Asynchrone Verarbeitung für bessere User Experience
- **Batch-Processing**: Optimierte Google Sheets Exports
- **Connection-Pooling**: Database-Performance-Optimierung

## [0.1.0] - 2024-06-26

### Hinzugefügt
- **Projekt-Initialisierung**: Grundlegende Strapi v4 Projektstruktur
- **Dokumentation**: Vollständige Projekt-Dokumentation (README, ARCHITECTURE, DEPLOYMENT, TODO)
- **Content Models**: Campaign und Lead Datenmodelle mit vollständigen Schemas
- **API-Struktur**: REST-API-Endpoints für Campaigns und Leads
- **Konfiguration**: Database-, Server-, Admin- und Middleware-Konfiguration
- **Dependencies**: Alle notwendigen NPM-Pakete für Strapi, PostgreSQL, Redis, Bull Queue
- **Code-Standards**: ESLint und Prettier Konfiguration
- **Environment-Setup**: .env.example mit allen notwendigen Environment-Variablen
- **Ordnerstruktur**: Professionelle, skalierbare Projektstruktur

### Architektur
- Strapi v4 als Headless CMS und API-Framework
- PostgreSQL als primäre Datenbank
- Redis für Caching und Queue-Management
- Modulare Service-Architektur für Skalierbarkeit

### Sicherheit
- Input-Validierung mit Joi
- CORS-Konfiguration für quiz.goaiex.com
- Rate-Limiting für API-Endpoints
- Structured Logging mit Winston

---

## Versioning-Schema

- **MAJOR**: Inkompatible API-Änderungen
- **MINOR**: Neue Funktionalität (rückwärtskompatibel)
- **PATCH**: Bugfixes (rückwärtskompatibel)

## Kategorien für Changelog-Einträge

- **Hinzugefügt**: Neue Features
- **Geändert**: Änderungen an bestehender Funktionalität
- **Deprecated**: Features, die in zukünftigen Versionen entfernt werden
- **Entfernt**: Entfernte Features
- **Behoben**: Bugfixes
- **Sicherheit**: Sicherheits-relevante Änderungen




