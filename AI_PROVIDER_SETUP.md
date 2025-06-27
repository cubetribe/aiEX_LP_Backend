# 🧠 AI Provider Setup Guide

## Required Environment Variables

Um das Prompt Testing System zu nutzen, müssen die entsprechenden AI Provider API Keys konfiguriert werden.

### OpenAI (ChatGPT)
```bash
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxx
```
**Wo bekomme ich den Key:**
1. Gehe zu [OpenAI Platform](https://platform.openai.com/api-keys)
2. Erstelle einen neuen API Key
3. Füge ihn zu Railway Environment Variables hinzu

**Kosten:** ~$0.0025-$0.01 pro Test (je nach Modell)

### Anthropic (Claude)
```bash
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxx
```
**Wo bekomme ich den Key:**
1. Gehe zu [Anthropic Console](https://console.anthropic.com/account/keys)
2. Erstelle einen neuen API Key
3. Füge ihn zu Railway Environment Variables hinzu

**Kosten:** ~$0.003-$0.015 pro Test (je nach Modell)

### Google (Gemini)
```bash
GOOGLE_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx
```
**Wo bekomme ich den Key:**
1. Gehe zu [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Erstelle einen neuen API Key
3. Füge ihn zu Railway Environment Variables hinzu

**Kosten:** ~$0.0001-$0.001 pro Test (sehr günstig)

## Railway Environment Variables Setup

1. **Railway Dashboard öffnen:**
   - Gehe zu deinem Railway Projekt
   - Klicke auf "Variables" Tab

2. **API Keys hinzufügen:**
   ```bash
   # OpenAI
   OPENAI_API_KEY=sk-proj-YOUR-KEY-HERE
   
   # Anthropic  
   ANTHROPIC_API_KEY=sk-ant-api03-YOUR-KEY-HERE
   
   # Google
   GOOGLE_API_KEY=AIzaSyYOUR-KEY-HERE
   ```

3. **Service redeploy:**
   - Railway deployed automatisch nach Variable-Änderungen
   - Warte 2-3 Minuten bis Deployment fertig ist

## Prompt Testing Access

Nach dem Setup sind folgende Endpoints verfügbar:

### 1. AI Status prüfen:
```bash
GET https://web-production-6df54.up.railway.app/ai/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "configured": {
      "openai": true,
      "anthropic": true, 
      "gemini": true
    },
    "available": ["openai", "anthropic", "gemini"]
  }
}
```

### 2. Prompt testen:
```bash
POST https://web-production-6df54.up.railway.app/ai/test-prompt
Content-Type: application/json

{
  "promptTemplate": "Erstelle eine Empfehlung für {{firstName}}...",
  "sampleDataId": "Unternehmer - Großunternehmen",
  "providers": ["openai", "anthropic", "gemini"],
  "model": "auto"
}
```

### 3. Prompt Templates laden:
```bash
GET https://web-production-6df54.up.railway.app/ai/prompt-templates
```

## Admin Panel Integration

Das Prompt Testing Interface wird verfügbar unter:
```
https://web-production-6df54.up.railway.app/admin/plugins/prompt-tester
```

## Provider Empfehlungen

### Für Business-Content:
- **OpenAI GPT-4o** - Beste Balance aus Qualität und Geschwindigkeit
- **Anthropic Claude** - Hervorragend für professionelle, strukturierte Antworten

### Für Personal-Content:
- **OpenAI GPT-4o** - Sehr gute Personalisierung und kreative Antworten
- **Google Gemini** - Kostengünstig für hohe Volumina

### Für technische Inhalte:
- **Anthropic Claude** - Präzise technische Erklärungen
- **OpenAI GPT-4** - Detaillierte technische Analysen

## Kosten-Übersicht

### Pro Prompt Test (alle 3 Provider):
- **Minimal:** ~$0.003 (nur Gemini)
- **Standard:** ~$0.01 (alle Provider) 
- **Premium:** ~$0.02 (mit GPT-4)

### Monatlich bei 100 Tests:
- **Nur testen:** ~$1-2
- **Live Production:** ~$5-20 (abhängig von Volumen)

## Sicherheit

- **API Keys niemals in Code commiten**
- **Nur in Environment Variables speichern**
- **Regelmäßig rotieren bei Production-Usage**
- **Monitoring der API-Kosten einrichten**

## Troubleshooting

### Provider nicht verfügbar:
1. API Key korrekt in Railway Environment Variables?
2. API Key gültig und nicht expired?
3. Ausreichend Credits/Budget auf dem Account?

### Test schlägt fehl:
1. Railway Service neu gestartet nach Variable-Änderung?
2. Internet-Verbindung für API-Calls verfügbar?
3. Rate-Limits der Provider erreicht?

---

**Nach dem Setup:** Das Prompt Testing System ermöglicht es, Prompts systematisch zu optimieren und die beste Response-Qualität für verschiedene Lead-Typen zu erreichen! 🚀