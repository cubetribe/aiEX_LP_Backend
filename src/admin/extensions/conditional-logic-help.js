import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails, 
  Chip,
  Button,
  Alert,
  Stack,
  Paper
} from '@strapi/design-system';
import { Information, ChevronDown, Copy, Play } from '@strapi/icons';

const ConditionalLogicHelp = () => {
  const [expandedSection, setExpandedSection] = useState(null);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // TODO: Add success notification
  };

  const basicExample = `{
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
        "if": { "user_type": "Privatperson" },
        "then": { "leadScore": 40, "leadQuality": "cold" }
      }
    ],
    "default": { "leadScore": 50, "leadQuality": "warm" }
  }
}`;

  const budgetExample = `{
  "title": "Budget-basierte Weiterleitung",
  "questions": [
    {
      "id": "budget",
      "question": "Welches Budget haben Sie?",
      "type": "single-choice",
      "options": ["Unter 1000€", "1000-5000€", "5000-20000€", "Über 20000€"],
      "required": true,
      "order": 1
    },
    {
      "id": "premium_features",
      "question": "Welche Premium-Features interessieren Sie?",
      "type": "multiple-choice",
      "options": ["KI-Integration", "Custom Development", "24/7 Support"],
      "required": true,
      "order": 2,
      "conditional": {
        "showIf": {
          "field": "budget",
          "operator": "in",
          "value": ["5000-20000€", "Über 20000€"]
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
      }
    ],
    "default": { "leadScore": 30, "leadQuality": "cold" }
  }
}`;

  const operators = [
    { name: 'equals', description: 'Exakte Übereinstimmung', example: '"operator": "equals", "value": "Unternehmer"' },
    { name: 'not_equals', description: 'Nicht gleich', example: '"operator": "not_equals", "value": "Kein Budget"' },
    { name: 'in', description: 'Einer von mehreren Werten', example: '"operator": "in", "value": ["Tech", "IT"]' },
    { name: 'not_in', description: 'Keiner von mehreren Werten', example: '"operator": "not_in", "value": ["Anfänger"]' }
  ];

  const scoringRanges = [
    { range: '90-100', quality: 'hot', color: 'danger', description: 'Premium-Leads, sofort kontaktieren' },
    { range: '70-89', quality: 'warm', color: 'warning', description: 'Qualifizierte Leads, Follow-up innerhalb 24h' },
    { range: '50-69', quality: 'cold', color: 'secondary', description: 'Potenzielle Leads, Nurturing-Kampagne' },
    { range: '< 50', quality: 'unqualified', color: 'neutral', description: 'Newsletter oder Requalifizierung' }
  ];

  return (
    <Box padding={4} background="neutral0" borderRadius="4px" shadow="filterShadow">
      <Stack spacing={4}>
        {/* Header */}
        <Box>
          <Stack spacing={2} horizontal>
            <Information />
            <Typography variant="beta">Conditional Logic Hilfe</Typography>
          </Stack>
          <Typography variant="pi" textColor="neutral600">
            Erweiterte Quiz-Konfiguration mit dynamischen Fragenverläufen
          </Typography>
        </Box>

        {/* Quick Start */}
        <Alert variant="default" title="Schnellstart">
          <Typography>
            Kopiere eins der Beispiele unten in das jsonCode Feld und passe es an deine Bedürfnisse an.
            Das jsonCode Feld überschreibt die Standard-Konfiguration.
          </Typography>
        </Alert>

        {/* Operators */}
        <Accordion 
          expanded={expandedSection === 'operators'} 
          onToggle={() => setExpandedSection(expandedSection === 'operators' ? null : 'operators')}
        >
          <AccordionSummary>
            <Typography variant="delta">Conditional Logic Operatoren</Typography>
            <ChevronDown />
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={3}>
              {operators.map((op) => (
                <Paper key={op.name} padding={3} shadow="tableShadow">
                  <Stack spacing={2}>
                    <Stack spacing={1} horizontal>
                      <Chip>{op.name}</Chip>
                      <Typography variant="sigma">{op.description}</Typography>
                    </Stack>
                    <Box
                      padding={2}
                      background="neutral100"
                      borderRadius="4px"
                      style={{ fontFamily: 'monospace', fontSize: '12px' }}
                    >
                      <code>{op.example}</code>
                    </Box>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Examples */}
        <Accordion 
          expanded={expandedSection === 'examples'} 
          onToggle={() => setExpandedSection(expandedSection === 'examples' ? null : 'examples')}
        >
          <AccordionSummary>
            <Typography variant="delta">Beispiel-Konfigurationen</Typography>
            <ChevronDown />
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={4}>
              {/* Basic Example */}
              <Box>
                <Stack spacing={2}>
                  <Typography variant="epsilon">1. Privat vs. Gewerblich</Typography>
                  <Typography variant="pi" textColor="neutral600">
                    Zeigt verschiedene Fragen basierend auf Benutzertyp
                  </Typography>
                  <Box
                    padding={3}
                    background="neutral100"
                    borderRadius="4px"
                    style={{ 
                      fontFamily: 'monospace', 
                      fontSize: '11px',
                      maxHeight: '200px',
                      overflow: 'auto'
                    }}
                  >
                    <pre>{basicExample}</pre>
                  </Box>
                  <Button 
                    variant="tertiary" 
                    startIcon={<Copy />}
                    onClick={() => copyToClipboard(basicExample)}
                    size="S"
                  >
                    Kopieren
                  </Button>
                </Stack>
              </Box>

              {/* Budget Example */}
              <Box>
                <Stack spacing={2}>
                  <Typography variant="epsilon">2. Budget-basierte Weiterleitung</Typography>
                  <Typography variant="pi" textColor="neutral600">
                    Zeigt Premium-Features nur bei höherem Budget
                  </Typography>
                  <Box
                    padding={3}
                    background="neutral100"
                    borderRadius="4px"
                    style={{ 
                      fontFamily: 'monospace', 
                      fontSize: '11px',
                      maxHeight: '200px',
                      overflow: 'auto'
                    }}
                  >
                    <pre>{budgetExample}</pre>
                  </Box>
                  <Button 
                    variant="tertiary" 
                    startIcon={<Copy />}
                    onClick={() => copyToClipboard(budgetExample)}
                    size="S"
                  >
                    Kopieren
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Scoring */}
        <Accordion 
          expanded={expandedSection === 'scoring'} 
          onToggle={() => setExpandedSection(expandedSection === 'scoring' ? null : 'scoring')}
        >
          <AccordionSummary>
            <Typography variant="delta">Lead-Scoring & Qualifizierung</Typography>
            <ChevronDown />
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={3}>
              <Typography variant="pi" textColor="neutral600">
                Automatische Lead-Bewertung basierend auf Antworten
              </Typography>
              {scoringRanges.map((range) => (
                <Stack key={range.range} spacing={2} horizontal>
                  <Box minWidth="60px">
                    <Typography variant="sigma">{range.range}</Typography>
                  </Box>
                  <Chip variant={range.color}>{range.quality}</Chip>
                  <Typography variant="pi" textColor="neutral600">
                    {range.description}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Validation */}
        <Accordion 
          expanded={expandedSection === 'validation'} 
          onToggle={() => setExpandedSection(expandedSection === 'validation' ? null : 'validation')}
        >
          <AccordionSummary>
            <Typography variant="delta">Validierung & Debugging</Typography>
            <ChevronDown />
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={3}>
              <Alert variant="default" title="Häufige Fehler">
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li>Eindeutige IDs für alle Fragen verwenden</li>
                  <li>Korrekte Referenzen in conditional.showIf</li>
                  <li>Exakte Übereinstimmung zwischen value und options</li>
                  <li>Gültige JSON-Syntax (Kommas, Anführungszeichen)</li>
                </ul>
              </Alert>
              
              <Box
                padding={3}
                background="neutral100"
                borderRadius="4px"
                style={{ fontFamily: 'monospace', fontSize: '12px' }}
              >
                <Typography variant="pi" fontWeight="bold">Debug-Modus aktivieren:</Typography>
                <pre>{`{
  "debug": {
    "enabled": true,
    "showConditionalLogic": true,
    "logScoring": true
  }
}`}</pre>
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Footer */}
        <Box padding={3} background="primary100" borderRadius="4px">
          <Stack spacing={2}>
            <Typography variant="epsilon" textColor="primary600">
              💡 Pro-Tipp
            </Typography>
            <Typography variant="pi" textColor="primary600">
              Starte mit einem einfachen Beispiel und erweitere schrittweise. 
              Das System unterstützt beliebig komplexe Verschachtelungen!
            </Typography>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};

export default ConditionalLogicHelp;