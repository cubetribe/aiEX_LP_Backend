# GoAIX - Deployment Guide

## 🚀 Deployment-Strategien

Dieses Dokument beschreibt verschiedene Deployment-Optionen für die GoAIX-Plattform, von lokaler Entwicklung bis hin zu Production-Deployments.

## 📋 Voraussetzungen

### System-Requirements
- **Node.js**: Version 18.x oder höher
- **PostgreSQL**: Version 13.x oder höher
- **Redis**: Version 6.x oder höher
- **RAM**: Minimum 2GB, empfohlen 4GB
- **Storage**: Minimum 10GB freier Speicherplatz

### External Services
- **Google Cloud Platform**: Service Account für Sheets API
- **AI-Provider-Keys**: OpenAI, Claude, oder Gemini API-Keys
- **E-Mail-Service**: SMTP-Credentials (optional)

## 🔧 Lokale Entwicklung

### 1. Repository Setup
```bash
git clone <repository-url>
cd goaix-backend
npm install
```

### 2. Environment-Konfiguration
```bash
cp .env.example .env
```

Bearbeite `.env` mit deinen lokalen Einstellungen:
```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=goaix_dev
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# AI Providers
OPENAI_API_KEY=your_openai_key
CLAUDE_API_KEY=your_claude_key
GEMINI_API_KEY=your_gemini_key

# Google Sheets
GOOGLE_SERVICE_ACCOUNT_PATH=./config/google-service-account.json
```

### 3. Database Setup
```bash
# PostgreSQL-Datenbank erstellen
createdb goaix_dev

# Strapi-Entwicklungsserver starten
npm run develop
```

### 4. Redis starten
```bash
# MacOS mit Homebrew
brew services start redis

# Ubuntu/Debian
sudo systemctl start redis-server

# Docker
docker run -d -p 6379:6379 redis:alpine
```

## 🐳 Docker-Deployment

### Development mit Docker Compose
```bash
# Alle Services starten
docker-compose up -d

# Logs verfolgen
docker-compose logs -f

# Services stoppen
docker-compose down
```

### Docker Compose Configuration
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "1337:1337"
    environment:
      - NODE_ENV=development
    depends_on:
      - postgres
      - redis
    volumes:
      - .:/app
      - /app/node_modules

  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: goaix_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

## ☁️ Cloud-Deployment

### AWS-Deployment mit Elastic Beanstalk

#### 1. EB CLI Installation
```bash
pip install awsebcli
```

#### 2. Application Setup
```bash
eb init goaix-backend
eb create goaix-production
```

#### 3. Environment Variables konfigurieren
```bash
eb setenv DATABASE_HOST=your-rds-endpoint \
         DATABASE_NAME=goaix_prod \
         REDIS_HOST=your-elasticache-endpoint \
         OPENAI_API_KEY=your-api-key
```

#### 4. Deploy
```bash
eb deploy
```

### Heroku-Deployment

#### 1. Heroku CLI Setup
```bash
heroku create goaix-backend
```

#### 2. Add-ons installieren
```bash
heroku addons:create heroku-postgresql:mini
heroku addons:create heroku-redis:mini
```

#### 3. Environment Variables
```bash
heroku config:set NODE_ENV=production
heroku config:set OPENAI_API_KEY=your-api-key
heroku config:set CLAUDE_API_KEY=your-api-key
```

#### 4. Deploy
```bash
git push heroku main
```

### Google Cloud Platform

#### 1. App Engine Setup
```yaml
# app.yaml
runtime: nodejs18

env_variables:
  NODE_ENV: production
  DATABASE_HOST: /cloudsql/project:region:instance
  
automatic_scaling:
  min_instances: 1
  max_instances: 10
```

#### 2. Cloud SQL & Redis Setup
```bash
# Cloud SQL-Instanz erstellen
gcloud sql instances create goaix-db --database-version=POSTGRES_13

# Redis-Instanz erstellen
gcloud redis instances create goaix-cache --size=1 --region=europe-west3
```

#### 3. Deploy
```bash
gcloud app deploy
```

## 🔄 CI/CD-Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run tests
      run: npm test
      
    - name: Run linting
      run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Deploy to Heroku
      uses: akhileshns/heroku-deploy@v3.12.12
      with:
        heroku_api_key: ${{secrets.HEROKU_API_KEY}}
        heroku_app_name: "goaix-backend"
        heroku_email: "your-email@example.com"
```

## 🔒 Production-Security

### Environment-Sicherheit
```bash
# Sichere .env-Datei-Berechtigung
chmod 600 .env

# Secrets-Management
# Verwende Cloud-Provider-Secrets (AWS Secrets Manager, etc.)
```

### SSL/TLS-Konfiguration
```javascript
// config/server.js
module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
  // SSL für Production
  ...(env('NODE_ENV') === 'production' && {
    url: env('STRAPI_URL'),
    proxy: true,
  }),
});
```

### Rate-Limiting
```javascript
// config/middlewares.js
module.exports = [
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', 'https:'],
          'media-src': ["'self'", 'data:', 'blob:'],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
  // Rate-Limiting-Middleware
  {
    name: 'rate-limiting',
    config: {
      interval: 60000, // 1 Minute
      max: 100, // 100 Requests pro Minute
    },
  },
];
```

## 📊 Monitoring & Logging

### Production-Logging
```javascript
// config/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'goaix-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    // Production: Cloud-Logging
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.Console({
        format: winston.format.simple()
      })
    ] : [])
  ],
});

module.exports = logger;
```

### Health-Checks
```javascript
// src/api/health/routes/health.js
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/health',
      handler: 'health.check',
      config: {
        auth: false,
      },
    },
  ],
};

// src/api/health/controllers/health.js
module.exports = {
  async check(ctx) {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: await checkDatabase(),
        redis: await checkRedis(),
        queues: await checkQueues(),
      },
    };
    
    ctx.body = health;
  },
};
```

## 🔧 Troubleshooting

### Häufige Deployment-Probleme

#### 1. Database-Connection-Fehler
```bash
# Überprüfe Database-Verbindung
npm run strapi:db:test

# Migration-Status prüfen
npm run strapi:migrate:status
```

#### 2. Redis-Connection-Probleme
```bash
# Redis-Verbindung testen
redis-cli ping

# Queue-Status prüfen
npm run queue:status
```

#### 3. Build-Probleme
```bash
# Node-Modules löschen und neu installieren
rm -rf node_modules package-lock.json
npm install

# Build-Cache löschen
npm run build:clean
npm run build
```

#### 4. Memory-Issues
```bash
# Node.js Memory-Limit erhöhen
export NODE_OPTIONS="--max-old-space-size=4096"
npm start
```

### Logging & Debugging
```bash
# Debug-Modus aktivieren
DEBUG=strapi:* npm run develop

# Detaillierte Logs
LOG_LEVEL=debug npm start

# Performance-Monitoring
NODE_ENV=production npm run start:pm2
```

## 📈 Scaling-Strategien

### Horizontal Scaling
- **Load Balancer**: NGINX oder Cloud Load Balancer
- **Multi-Instance**: PM2 Cluster-Mode
- **Database**: Read-Replicas für bessere Performance

### Vertical Scaling
- **Memory**: 4GB+ für Production
- **CPU**: Multi-Core für bessere Performance
- **Storage**: SSD für Database und Redis

### Caching-Optimization
- **CDN**: Statische Assets über CDN
- **Redis**: Aggressive Caching-Strategy
- **Database**: Query-Optimization und Indexing

---

**Letztes Update**: 26.06.2024
**Deployment-Version**: 1.0
**Support**: Bei Deployment-Problemen Issue erstellen