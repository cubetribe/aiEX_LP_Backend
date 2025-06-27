# 🎯 Conditional Logic Configuration Guide

## Übersicht

Das **jsonCode** Feld ermöglicht erweiterte Conditional Logic für deine Quiz-Kampagnen. Hier kannst du komplexe Fragenverläufe, dynamische Bewertungen und intelligente Lead-Qualifizierung konfigurieren.

## 🚀 Basis-Struktur

```json
{
  "title": "Dein Quiz-Titel",
  "description": "Quiz-Beschreibung",
  "questions": [
    {
      "id": "eindeutige_id",
      "question": "Deine Frage?",
      "type": "single-choice",
      "options": ["Option A", "Option B", "Option C"],
      "required": true,
      "order": 1,
      "conditional": {
        "showIf": {
          "field": "vorherige_frage_id",
          "operator": "equals",
          "value": "Antwort"
        }
      }
    }
  ],
  "scoring": {
    "logic": "conditional",
    "rules": [
      {
        "if": { "frage_id": "Antwort" },
        "then": { "leadScore": 80, "leadQuality": "hot" }
      }
    ],
    "default": { "leadScore": 50, "leadQuality": "warm" }
  }
}
```

## 📋 Conditional Logic Operatoren

### 1. **equals** - Exakte Übereinstimmung
```json
"conditional": {
  "showIf": {
    "field": "user_type",
    "operator": "equals",
    "value": "Unternehmer"
  }
}
```

### 2. **not_equals** - Nicht gleich
```json
"conditional": {
  "showIf": {
    "field": "budget",
    "operator": "not_equals", 
    "value": "Kein Budget"
  }
}
```

### 3. **in** - Einer von mehreren Werten
```json
"conditional": {
  "showIf": {
    "field": "industry",
    "operator": "in",
    "value": ["Tech", "Software", "IT"]
  }
}
```

### 4. **not_in** - Keiner von mehreren Werten
```json
"conditional": {
  "showIf": {
    "field": "experience",
    "operator": "not_in",
    "value": ["Anfänger", "Keine Erfahrung"]
  }
}
```

## 🎯 Praktische Anwendungsfälle

### Use Case 1: Privat vs. Gewerblich
```json
{
  "title": "AI-Bedarfsanalyse",
  "questions": [
    {
      "id": "user_type",
      "question": "Sind Sie Privatperson oder Unternehmer?",
      "type": "single-choice",
      "options": ["Privatperson", "Unternehmer"],
      "required": true,
      "order": 1
    },
    {
      "id": "company_size",
      "question": "Wie viele Mitarbeiter hat Ihr Unternehmen?",
      "type": "single-choice",
      "options": ["1-10", "11-50", "51-200", "200+"],
      "required": true,
      "order": 2,
      "conditional": {
        "showIf": {
          "field": "user_type",
          "operator": "equals",
          "value": "Unternehmer"
        }
      }
    },
    {
      "id": "private_income",
      "question": "In welcher Einkommensklasse befinden Sie sich?",
      "type": "single-choice",
      "options": ["Unter 30k", "30k-60k", "60k-100k", "Über 100k"],
      "required": true,
      "order": 2,
      "conditional": {
        "showIf": {
          "field": "user_type",
          "operator": "equals",
          "value": "Privatperson"
        }
      }
    }
  ],
  "scoring": {
    "logic": "conditional",
    "rules": [
      {
        "if": { "user_type": "Unternehmer", "company_size": "200+" },
        "then": { "leadScore": 95, "leadQuality": "hot" }
      },
      {
        "if": { "user_type": "Privatperson", "private_income": "Über 100k" },
        "then": { "leadScore": 60, "leadQuality": "warm" }
      }
    ],
    "default": { "leadScore": 40, "leadQuality": "cold" }
  }
}
```

### Use Case 2: Budget-basierte Weiterleitung
```json
{
  "title": "Service-Auswahl",
  "questions": [
    {
      "id": "budget",
      "question": "Welches Budget haben Sie für unser Service?",
      "type": "single-choice",
      "options": ["Unter 1000€", "1000-5000€", "5000-20000€", "Über 20000€"],
      "required": true,
      "order": 1
    },
    {
      "id": "premium_features",
      "question": "Welche Premium-Features interessieren Sie?",
      "type": "multiple-choice",
      "options": ["KI-Integration", "Custom Development", "24/7 Support", "Dedicated Manager"],
      "required": true,
      "order": 2,
      "conditional": {
        "showIf": {
          "field": "budget",
          "operator": "in",
          "value": ["5000-20000€", "Über 20000€"]
        }
      }
    },
    {
      "id": "basic_package",
      "question": "Welche Basis-Features sind wichtig?",
      "type": "multiple-choice",
      "options": ["Standard Support", "Basis-Setup", "Dokumentation"],
      "required": true,
      "order": 2,
      "conditional": {
        "showIf": {
          "field": "budget",
          "operator": "in",
          "value": ["Unter 1000€", "1000-5000€"]
        }
      }
    }
  ],
  "scoring": {
    "logic": "conditional",
    "rules": [
      {
        "if": { "budget": "Über 20000€" },
        "then": { "leadScore": 100, "leadQuality": "hot" }
      },
      {
        "if": { "budget": "5000-20000€" },
        "then": { "leadScore": 80, "leadQuality": "hot" }
      },
      {
        "if": { "budget": "1000-5000€" },
        "then": { "leadScore": 60, "leadQuality": "warm" }
      }
    ],
    "default": { "leadScore": 30, "leadQuality": "cold" }
  }
}
```

### Use Case 3: Erfahrungsbasierte Empfehlungen
```json
{
  "title": "Tech-Expertise Assessment",
  "questions": [
    {
      "id": "experience",
      "question": "Wie viel Erfahrung haben Sie mit AI-Tools?",
      "type": "single-choice",
      "options": ["Keine", "Wenig", "Mittel", "Viel", "Experte"],
      "required": true,
      "order": 1
    },
    {
      "id": "advanced_tools",
      "question": "Welche fortgeschrittenen Tools kennen Sie?",
      "type": "multiple-choice",
      "options": ["GPT-4", "Claude", "Midjourney", "Custom APIs", "AI Training"],
      "required": true,
      "order": 2,
      "conditional": {
        "showIf": {
          "field": "experience",
          "operator": "in",
          "value": ["Viel", "Experte"]
        }
      }
    },
    {
      "id": "beginner_interests",
      "question": "Was möchten Sie mit AI erreichen?",
      "type": "single-choice",
      "options": ["Texte schreiben", "Bilder erstellen", "Daten analysieren", "Automatisierung"],
      "required": true,
      "order": 2,
      "conditional": {
        "showIf": {
          "field": "experience",
          "operator": "in",
          "value": ["Keine", "Wenig"]
        }
      }
    }
  ],
  "scoring": {
    "logic": "conditional",
    "rules": [
      {
        "if": { "experience": "Experte" },
        "then": { "leadScore": 90, "leadQuality": "hot" }
      },
      {
        "if": { "experience": "Viel" },
        "then": { "leadScore": 75, "leadQuality": "warm" }
      },
      {
        "if": { "experience": "Keine", "beginner_interests": "Automatisierung" },
        "then": { "leadScore": 65, "leadQuality": "warm" }
      }
    ],
    "default": { "leadScore": 45, "leadQuality": "cold" }
  }
}
```

## 🎨 Styling & Verhalten

```json
{
  "styling": {
    "primaryColor": "#007bff",
    "secondaryColor": "#6c757d",
    "backgroundColor": "#f8f9fa",
    "textColor": "#212529",
    "buttonStyle": "rounded",
    "animation": "fadeIn"
  },
  "behavior": {
    "showProgress": true,
    "allowBack": true,
    "randomizeQuestions": false,
    "conditionalLogic": true,
    "autoAdvance": false,
    "showQuestionNumbers": true,
    "requireAllAnswers": true
  }
}
```

## 🏆 Lead-Qualifizierung

### Scoring-Bereiche
- **90-100 Punkte**: `hot` - Premium-Leads, sofort kontaktieren
- **70-89 Punkte**: `warm` - Qualifizierte Leads, Follow-up innerhalb 24h
- **50-69 Punkte**: `cold` - Potenzielle Leads, Nurturing-Kampagne
- **Unter 50 Punkte**: `unqualified` - Newsletter oder Requalifizierung

### Erweiterte Scoring-Regeln
```json
{
  "scoring": {
    "logic": "conditional",
    "rules": [
      {
        "if": { "budget": "Über 20000€", "experience": "Viel" },
        "then": { "leadScore": 100, "leadQuality": "hot", "priority": "immediate" }
      },
      {
        "if": { "user_type": "Unternehmer", "company_size": "200+" },
        "then": { "leadScore": 95, "leadQuality": "hot", "priority": "high" }
      },
      {
        "and": [
          { "budget": "5000-20000€" },
          { "experience": { "operator": "in", "value": ["Mittel", "Viel"] } }
        ],
        "then": { "leadScore": 85, "leadQuality": "hot", "priority": "high" }
      }
    ],
    "weights": {
      "budget": 0.4,
      "experience": 0.3,
      "company_size": 0.2,
      "urgency": 0.1
    },
    "default": { "leadScore": 50, "leadQuality": "warm", "priority": "normal" }
  }
}
```

## 🔧 Validierung & Debugging

### Häufige Fehler vermeiden
1. **Eindeutige IDs**: Jede Frage braucht eine unique `id`
2. **Korrekte Referenzen**: `field` in `conditional.showIf` muss existierende Fragen-`id` sein
3. **Gültige Werte**: `value` muss exakt mit `options` übereinstimmen
4. **JSON-Syntax**: Kommas, Anführungszeichen, Klammern prüfen

### Test-Modus aktivieren
```json
{
  "debug": {
    "enabled": true,
    "showConditionalLogic": true,
    "logScoring": true,
    "testMode": true
  }
}
```

## 📞 Support & Beispiele

### Weitere Vorlagen
- E-Commerce Produkt-Finder
- Immobilien-Matching
- Karriere-Beratung
- Fitness-Programm-Auswahl
- Software-Needs-Assessment

### Technischer Support
Bei Problemen mit der Conditional Logic:
1. JSON-Syntax mit Online-Validator prüfen
2. Fragen-IDs auf Eindeutigkeit prüfen
3. Operator-Syntax validieren
4. Test-Modus für Debugging aktivieren

---

**Tipp**: Starte mit einfachen Conditional Logic Regeln und erweitere schrittweise. Das System unterstützt beliebig komplexe Verschachtelungen!