# GoAIX - AI-Lead-Magnet-Plattform

Eine professionelle AI-Lead-Magnet-Plattform mit kampagnenbasierten Landing Pages und intelligenter Lead-Auswertung.

## 🚀 Projektübersicht

GoAIX ermöglicht die Erstellung und Verwaltung von kampagnenbasierten Landing Pages mit verschiedenen Interaktionstypen (Quiz, Chatbot, Image Upload, etc.) und automatischer AI-basierter Auswertung der Lead-Daten.

### Kernfunktionen

- **Kampagnen-Management**: Verschiedene Kampagnentypen (quiz, imageUpload, chatbot, textOnly, custom)
- **AI-Integration**: Multi-Provider-Support (OpenAI, Claude, Gemini) für personalisierte Ergebnisse
- **Lead-Export**: Automatischer Export zu Google Sheets
- **Asynchrone Verarbeitung**: Bull Queue für performante Background-Jobs
- **Admin-Panel**: Vollständiges Strapi-Admin-Interface

## 🛠️ Technische Architektur

### Backend-Stack
- **Strapi v4**: Headless CMS & API Framework
- **PostgreSQL**: Primäre Datenbank
- **Redis**: Caching & Queue-Management
- **Bull Queue**: Asynchrone Job-Verarbeitung
- **Google Sheets API**: Lead-Export-Integration

### API-Endpoints

#### Kampagnen
- `GET /api/campaigns/:slug` - Kampagnen-Details abrufen
- `POST /api/campaigns/:slug/submit` - Lead-Submission

#### Leads
- `GET /api/leads` - Lead-Liste (Admin)
- `POST /api/leads` - Neuen Lead erstellen

#### AI-Processing
- `POST /api/ai/process` - AI-Auswertung starten

## 🔧 Installation & Setup

### Voraussetzungen
- Node.js >= 18.x
- PostgreSQL >= 13.x
- Redis >= 6.x
- Google Cloud Service Account (für Sheets-Integration)

### 1. Repository klonen & Dependencies installieren
```bash
git clone <repository-url>
cd goaix-backend
npm install
```

### 2. Environment-Variablen konfigurieren
```bash
cp .env.example .env
# .env-Datei mit entsprechenden Werten füllen
```

### 3. Datenbank einrichten
```bash
# PostgreSQL-Datenbank erstellen
createdb goaix_db

# Strapi-Tabellen erstellen
npm run strapi:build
npm run develop
```

### 4. Google Sheets Setup
1. Google Cloud Console: Service Account erstellen
2. Credentials JSON-Datei herunterladen
3. Pfad in .env als `GOOGLE_SERVICE_ACCOUNT_PATH` eintragen

## 📊 Datenmodelle

### Campaign
```javascript
{
  slug: "unique-campaign-identifier",
  title: "Kampagnen-Anzeigename",
  campaignType: "quiz|imageUpload|chatbot|textOnly|custom",
  config: {}, // Flexible Konfiguration je Typ
  aiPromptTemplate: "Template für AI-Prompts",
  emailTemplate: "E-Mail-Template für Ergebnisse",
  googleSheetId: "Google Sheets ID (optional)",
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z"
}
```

### Lead
```javascript
{
  campaignId: "relation-to-campaign",
  firstName: "Vorname",
  email: "email@example.com",
  responses: {}, // User-Antworten als JSON
  aiResult: "Generiertes AI-Ergebnis",
  googleSheetsExported: false,
  createdAt: "2024-01-01T00:00:00.000Z"
}
```

## 🎯 Development-Scripts

```bash
# Development-Server starten
npm run develop

# Production-Build erstellen
npm run build

# Production-Server starten
npm start

# Tests ausführen
npm test

# Linting
npm run lint

# Code-Formatierung
npm run format

# Database-Migration
npm run strapi:migrate
```

## 🔐 Authentifizierung & Sicherheit

- Admin-Panel: Strapi-eigene Authentifizierung
- API-Endpoints: JWT-basierte Authentifizierung
- Rate-Limiting für öffentliche Endpoints
- Input-Validierung mit Joi
- CORS-Konfiguration für Frontend-Integration

## 📈 Monitoring & Logging

- Winston-Logger für strukturierte Logs
- Bull Dashboard für Queue-Monitoring
- Strapi Admin-Panel für Content-Management
- Custom Middleware für Request-Logging

## 🚀 Deployment

Siehe [DEPLOYMENT.md](./DEPLOYMENT.md) für detaillierte Deployment-Anweisungen.

## 📝 Changelog

Siehe [CHANGELOG.md](./CHANGELOG.md) für Versionshistorie.

## 📋 TODO

Siehe [TODO.md](./TODO.md) für aktuelle Aufgaben und Roadmap.

## 🏗️ Architektur

Siehe [ARCHITECTURE.md](./ARCHITECTURE.md) für detaillierte Architektur-Dokumentation.

## 📞 Support

Bei Fragen oder Problemen erstelle ein Issue oder kontaktiere das Entwicklungsteam.

---

**GoAIX** - Intelligente Lead-Generierung mit AI-Power 🚀