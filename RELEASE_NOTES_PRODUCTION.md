# PRODUCTION RELEASE NOTES - GoAIX Platform
## Version: Production Ready (30.06.2025)

### 🎯 KRITISCHE ÄNDERUNGEN FÜR STABILE PRODUKTION

#### 1. AI Provider Einschränkung
- **Nur GPT-4o (OpenAI) ist aktiviert**
- Provider und Model Felder sind im Admin Panel sichtbar aber nicht editierbar
- Felder zeigen Hinweise: "Derzeit nur OpenAI/GPT-4o verfügbar"
- Weitere Modelle (Claude, Gemini) werden nach finaler Testphase freigeschaltet

#### 2. JSON-Feldtyp für Konfiguration
- **jsonCode** wurde von `text` auf `json` Typ umgestellt
- Strapi validiert automatisch die JSON-Syntax
- Verhindert ungültige JSON-Einträge in der Datenbank
- Bietet bessere Editor-Unterstützung im Admin Panel

#### 3. Inline-Hilfe System
- Alle wichtigen Felder haben jetzt `description` Attribute
- Hilfe wird direkt unter den Feldern angezeigt
- Dokumentiert verfügbare Variablen und Syntax

### 📝 DOKUMENTIERTE FEATURES

#### Template Variablen
In AI Prompts und Email Templates verfügbar:
- `{{firstName}}` - Vorname des Leads
- `{{email}}` - E-Mail-Adresse  
- `{{responses}}` - Quiz-Antworten als JSON
- `{{leadScore}}` - Lead Score (0-100)
- `{{leadQuality}}` - Lead Qualität (hot/warm/cold)
- `{{campaignTitle}}` - Name der Kampagne
- `{{aiResult}}` - AI-generiertes Ergebnis (nur in Emails)

#### Conditional Logic (jsonCode)
```json
{
  "questions": [
    {
      "id": "q1",
      "type": "single-choice",
      "question": "Ihre Frage?",
      "options": ["A", "B", "C"],
      "showIf": {
        "field": "q0",
        "operator": "equals",
        "value": "bestimmterWert"
      }
    }
  ],
  "scoring": {
    "logic": "conditional",
    "rules": [
      {
        "if": { "user_type": "Unternehmer" },
        "then": { "leadScore": 80, "leadQuality": "hot" }
      }
    ]
  }
}
```

### 🚀 DEPLOYMENT CHECKLIST

1. **Backend neu starten** nach Schema-Änderungen
2. **Admin Panel Cache leeren** (Browser)
3. **Existierende Campaigns prüfen** - jsonCode Feld könnte Validierung benötigen
4. **API Keys verifizieren** - Nur OPENAI_API_KEY wird benötigt

### ⚠️ BEKANNTE EINSCHRÄNKUNGEN

1. Nur GPT-4o ist verfügbar (andere Modelle deaktiviert)
2. JSON-Felder müssen valides JSON enthalten (keine Kommentare!)
3. Textarea-Felder sind manuell in der Höhe verstellbar (Browser-Feature)

### 🔒 SICHERHEIT

- Keine Model-Mappings mehr im Code (direkter API-Aufruf)
- Provider/Model Auswahl ist hartcodiert auf OpenAI/GPT-4o
- JSON-Validierung verhindert Code-Injection

---
Bereit für Produktion: ✅