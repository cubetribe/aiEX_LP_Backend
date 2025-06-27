import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Modal, 
  ModalLayout, 
  ModalHeader, 
  ModalBody, 
  ModalFooter,
  Grid,
  GridItem,
  Card,
  CardHeader,
  CardBody,
  CardContent,
  Badge,
  Stack,
  Divider,
  Alert
} from '@strapi/design-system';
import { Eye, Download, Information } from '@strapi/icons';

const TemplateSelector = ({ onSelectTemplate, isOpen, onClose }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Template data (in real implementation, this would come from the templates utility)
  const templates = [
    {
      id: 'privat-gewerblich',
      name: 'Privat vs. Gewerblich',
      description: 'Unterschiedliche Fragenverläufe für Privatpersonen und Unternehmer',
      category: 'lead-qualification',
      questions: 6,
      conditionalRules: 4,
      difficulty: 'Einfach',
      useCase: 'B2B/B2C Lead-Qualifizierung'
    },
    {
      id: 'budget-weiterleitung',
      name: 'Budget-basierte Weiterleitung',
      description: 'Zeigt verschiedene Service-Optionen basierend auf Budget',
      category: 'service-selection',
      questions: 5,
      conditionalRules: 3,
      difficulty: 'Einfach',
      useCase: 'Service-Auswahl & Pricing'
    },
    {
      id: 'erfahrungs-assessment',
      name: 'Tech-Expertise Assessment',
      description: 'Personalisierte Empfehlungen basierend auf technischer Erfahrung',
      category: 'skill-assessment',
      questions: 5,
      conditionalRules: 4,
      difficulty: 'Mittel',
      useCase: 'Skill-basierte Empfehlungen'
    },
    {
      id: 'product-finder',
      name: 'E-Commerce Produkt-Finder',
      description: 'Hilft Kunden, das richtige Produkt zu finden',
      category: 'product-recommendation',
      questions: 5,
      conditionalRules: 3,
      difficulty: 'Einfach',
      useCase: 'Produkt-Empfehlungen'
    },
    {
      id: 'fitness-program',
      name: 'Fitness-Programm-Auswahl',
      description: 'Personalisierte Fitness-Programm-Empfehlungen',
      category: 'health-fitness',
      questions: 5,
      conditionalRules: 2,
      difficulty: 'Einfach',
      useCase: 'Health & Fitness'
    }
  ];

  const categoryColors = {
    'lead-qualification': 'primary',
    'service-selection': 'secondary',
    'skill-assessment': 'success',
    'product-recommendation': 'warning',
    'health-fitness': 'danger'
  };

  const difficultyColors = {
    'Einfach': 'success',
    'Mittel': 'warning',
    'Schwer': 'danger'
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
  };

  const handlePreviewTemplate = (template) => {
    setPreviewTemplate(template);
    setShowPreview(true);
  };

  const handleConfirmSelection = () => {
    if (selectedTemplate && onSelectTemplate) {
      // In real implementation, load the actual template config
      const templateConfig = getTemplateConfig(selectedTemplate.id);
      onSelectTemplate(templateConfig);
      onClose();
    }
  };

  // Mock function - in real implementation, this would load from templates utility
  const getTemplateConfig = (templateId) => {
    // This would return the actual JSON config from conditional-logic-templates.js
    return {
      title: `Template: ${templateId}`,
      questions: [],
      scoring: { logic: 'conditional' }
    };
  };

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} labelledBy="template-selector-title">
      <ModalLayout>
        <ModalHeader>
          <Typography variant="beta" id="template-selector-title">
            📋 Template-Bibliothek
          </Typography>
        </ModalHeader>
        
        <ModalBody>
          <Stack spacing={4}>
            <Alert variant="default" title="Template auswählen">
              <Typography>
                Wählen Sie eine vorgefertigte Conditional Logic Konfiguration aus. 
                Sie können das Template nach dem Import beliebig anpassen.
              </Typography>
            </Alert>

            <Grid gap={4}>
              {templates.map((template) => (
                <GridItem key={template.id} col={6}>
                  <Card
                    style={{
                      cursor: 'pointer',
                      border: selectedTemplate?.id === template.id 
                        ? '2px solid #4945ff' 
                        : '1px solid #dcdce4',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <CardHeader>
                      <Stack spacing={2}>
                        <Stack spacing={1} horizontal>
                          <Typography variant="delta">{template.name}</Typography>
                          <Badge variant={categoryColors[template.category]}>
                            {template.category}
                          </Badge>
                        </Stack>
                        <Typography variant="pi" textColor="neutral600">
                          {template.description}
                        </Typography>
                      </Stack>
                    </CardHeader>
                    
                    <CardBody>
                      <Stack spacing={3}>
                        <Stack spacing={2}>
                          <Typography variant="sigma" textColor="neutral700">
                            📊 Details
                          </Typography>
                          <Box padding={2} background="neutral100" borderRadius="4px">
                            <Stack spacing={1}>
                              <Stack spacing={2} horizontal>
                                <Typography variant="pi">
                                  <strong>Fragen:</strong> {template.questions}
                                </Typography>
                                <Typography variant="pi">
                                  <strong>Regeln:</strong> {template.conditionalRules}
                                </Typography>
                              </Stack>
                              <Stack spacing={2} horizontal>
                                <Typography variant="pi">
                                  <strong>Schwierigkeit:</strong>
                                </Typography>
                                <Badge variant={difficultyColors[template.difficulty]} size="S">
                                  {template.difficulty}
                                </Badge>
                              </Stack>
                              <Typography variant="pi">
                                <strong>Use Case:</strong> {template.useCase}
                              </Typography>
                            </Stack>
                          </Box>
                        </Stack>

                        <Divider />

                        <Stack spacing={2} horizontal>
                          <Button
                            variant="tertiary"
                            startIcon={<Eye />}
                            size="S"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewTemplate(template);
                            }}
                          >
                            Vorschau
                          </Button>
                          <Button
                            variant={selectedTemplate?.id === template.id ? 'default' : 'tertiary'}
                            size="S"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectTemplate(template);
                            }}
                          >
                            {selectedTemplate?.id === template.id ? '✓ Ausgewählt' : 'Auswählen'}
                          </Button>
                        </Stack>
                      </Stack>
                    </CardBody>
                  </Card>
                </GridItem>
              ))}
            </Grid>

            {selectedTemplate && (
              <Alert variant="success" title="Template ausgewählt">
                <Typography>
                  <strong>{selectedTemplate.name}</strong> wird als Basis-Konfiguration geladen. 
                  Sie können alle Einstellungen nach dem Import anpassen.
                </Typography>
              </Alert>
            )}
          </Stack>
        </ModalBody>

        <ModalFooter
          startActions={
            <Button variant="tertiary" onClick={onClose}>
              Abbrechen
            </Button>
          }
          endActions={
            <Button 
              variant="default" 
              disabled={!selectedTemplate}
              onClick={handleConfirmSelection}
              startIcon={<Download />}
            >
              Template laden
            </Button>
          }
        />
      </ModalLayout>

      {/* Preview Modal */}
      {showPreview && previewTemplate && (
        <Modal onClose={() => setShowPreview(false)} labelledBy="template-preview-title">
          <ModalLayout>
            <ModalHeader>
              <Typography variant="beta" id="template-preview-title">
                👁️ Vorschau: {previewTemplate.name}
              </Typography>
            </ModalHeader>
            
            <ModalBody>
              <Stack spacing={4}>
                <Box>
                  <Typography variant="epsilon">Beschreibung</Typography>
                  <Typography variant="pi" textColor="neutral600">
                    {previewTemplate.description}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="epsilon">Template-Struktur</Typography>
                  <Box
                    padding={3}
                    background="neutral100"
                    borderRadius="4px"
                    style={{ fontFamily: 'monospace', fontSize: '12px' }}
                  >
                    <pre>{`{
  "title": "${previewTemplate.name}",
  "questions": [
    // ${previewTemplate.questions} Fragen mit ${previewTemplate.conditionalRules} conditional rules
    {
      "id": "question_1",
      "question": "Beispiel-Frage...",
      "type": "single-choice",
      "options": ["Option A", "Option B"],
      "conditional": {
        "showIf": {
          "field": "previous_question",
          "operator": "equals",
          "value": "specific_answer"
        }
      }
    }
    // ... weitere Fragen
  ],
  "scoring": {
    "logic": "conditional",
    "rules": [
      {
        "if": { "field": "value" },
        "then": { "leadScore": 80, "leadQuality": "hot" }
      }
    ]
  }
}`}</pre>
                  </Box>
                </Box>

                <Alert variant="default" title="Anpassungen möglich">
                  <Typography>
                    Nach dem Import können Sie alle Fragen, Antwortoptionen, Conditional Logic Regeln 
                    und Scoring-Parameter beliebig anpassen.
                  </Typography>
                </Alert>
              </Stack>
            </ModalBody>

            <ModalFooter
              startActions={
                <Button variant="tertiary" onClick={() => setShowPreview(false)}>
                  Schließen
                </Button>
              }
              endActions={
                <Button 
                  variant="default"
                  onClick={() => {
                    handleSelectTemplate(previewTemplate);
                    setShowPreview(false);
                  }}
                >
                  Template auswählen
                </Button>
              }
            />
          </ModalLayout>
        </Modal>
      )}
    </Modal>
  );
};

export default TemplateSelector;