import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  TextInput,
  Textarea,
  Select,
  Option,
  Grid,
  GridItem,
  Card,
  CardBody,
  Stack,
  Badge,
  Alert,
  Loader,
  Tabs,
  Tab,
  TabGroup,
  TabPanels,
  TabPanel,
  Divider
} from '@strapi/design-system';
import { Play, Download, Refresh, Information } from '@strapi/icons';

const PromptTester = () => {
  const [promptTemplate, setPromptTemplate] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedSampleData, setSelectedSampleData] = useState('');
  const [selectedProviders, setSelectedProviders] = useState(['openai', 'anthropic', 'gemini']);
  const [selectedModel, setSelectedModel] = useState('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [sampleData, setSampleData] = useState([]);
  const [aiStatus, setAiStatus] = useState({});

  useEffect(() => {
    loadTemplates();
    loadSampleData();
    loadAIStatus();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/ai/prompt-templates');
      const data = await response.json();
      if (data.success) {
        setTemplates(data.data);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const loadSampleData = async () => {
    try {
      const response = await fetch('/ai/sample-data');
      const data = await response.json();
      if (data.success) {
        setSampleData(data.data);
        if (data.data.length > 0) {
          setSelectedSampleData(data.data[0].name);
        }
      }
    } catch (error) {
      console.error('Failed to load sample data:', error);
    }
  };

  const loadAIStatus = async () => {
    try {
      const response = await fetch('/ai/status');
      const data = await response.json();
      if (data.success) {
        setAiStatus(data.data);
      }
    } catch (error) {
      console.error('Failed to load AI status:', error);
    }
  };

  const loadTemplate = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setPromptTemplate(template.template);
      setSelectedTemplate(templateId);
    }
  };

  const testPrompt = async () => {
    if (!promptTemplate.trim()) {
      alert('Bitte geben Sie einen Prompt ein');
      return;
    }

    setIsLoading(true);
    setResults(null);

    try {
      const response = await fetch('/ai/test-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          promptTemplate,
          sampleDataId: selectedSampleData,
          providers: selectedProviders,
          model: selectedModel
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setResults(data.data);
      } else {
        alert(`Fehler: ${data.error}`);
      }
    } catch (error) {
      console.error('Test failed:', error);
      alert('Test fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  const getProviderBadgeColor = (provider) => {
    const colors = {
      openai: 'primary',
      anthropic: 'secondary', 
      gemini: 'success'
    };
    return colors[provider] || 'neutral';
  };

  const getQualityColor = (score) => {
    if (score === 'optimal') return 'success';
    if (score === 'good') return 'warning';
    return 'danger';
  };

  const formatCost = (cost) => {
    if (!cost) return '$0.00';
    return `$${cost.toFixed(4)}`;
  };

  const formatDuration = (duration) => {
    if (!duration) return '0ms';
    return `${duration}ms`;
  };

  return (
    <Box padding={6}>
      <Stack spacing={6}>
        {/* Header */}
        <Box>
          <Typography variant="alpha">🧠 AI Prompt Tester</Typography>
          <Typography variant="pi" textColor="neutral600">
            Testen Sie Ihre Prompts mit echten AI-Providern und optimieren Sie die Response-Qualität
          </Typography>
        </Box>

        {/* AI Status */}
        <Card>
          <CardBody>
            <Stack spacing={3}>
              <Typography variant="beta">Provider Status</Typography>
              <Grid gap={4}>
                {Object.entries(aiStatus.configured || {}).map(([provider, isConfigured]) => (
                  <GridItem key={provider} col={4}>
                    <Stack spacing={2} horizontal>
                      <Badge variant={isConfigured ? 'success' : 'danger'}>
                        {provider.toUpperCase()}
                      </Badge>
                      <Typography variant="pi">
                        {isConfigured ? 'Konfiguriert' : 'Nicht verfügbar'}
                      </Typography>
                    </Stack>
                  </GridItem>
                ))}
              </Grid>
            </Stack>
          </CardBody>
        </Card>

        {/* Prompt Configuration */}
        <Card>
          <CardBody>
            <Stack spacing={4}>
              <Typography variant="beta">Prompt Konfiguration</Typography>
              
              {/* Template Selector */}
              <Box>
                <Typography variant="pi" fontWeight="bold" marginBottom={2}>
                  Prompt Template auswählen (optional)
                </Typography>
                <Select
                  placeholder="Template auswählen..."
                  value={selectedTemplate}
                  onChange={setSelectedTemplate}
                  onSelectionChange={loadTemplate}
                >
                  {templates.map((template) => (
                    <Option key={template.id} value={template.id}>
                      {template.name} - {template.description}
                    </Option>
                  ))}
                </Select>
              </Box>

              {/* Prompt Input */}
              <Box>
                <Typography variant="pi" fontWeight="bold" marginBottom={2}>
                  Prompt Template
                </Typography>
                <Textarea
                  placeholder="Geben Sie Ihren Prompt ein... Verwenden Sie {{variables}} für dynamische Inhalte."
                  value={promptTemplate}
                  onChange={(e) => setPromptTemplate(e.target.value)}
                  style={{ minHeight: '200px', fontFamily: 'monospace', fontSize: '13px' }}
                />
              </Box>

              {/* Test Configuration */}
              <Grid gap={4}>
                <GridItem col={4}>
                  <Typography variant="pi" fontWeight="bold" marginBottom={2}>
                    Test-Daten
                  </Typography>
                  <Select
                    value={selectedSampleData}
                    onChange={setSelectedSampleData}
                  >
                    {sampleData.map((sample) => (
                      <Option key={sample.name} value={sample.name}>
                        {sample.name}
                      </Option>
                    ))}
                  </Select>
                </GridItem>

                <GridItem col={4}>
                  <Typography variant="pi" fontWeight="bold" marginBottom={2}>
                    AI Model
                  </Typography>
                  <Select value={selectedModel} onChange={setSelectedModel}>
                    <Option value="auto">Auto (Empfohlen)</Option>
                    <Option value="gpt-4o">GPT-4o</Option>
                    <Option value="gpt-4o-mini">GPT-4o Mini</Option>
                    <Option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</Option>
                    <Option value="gemini-1.5-flash">Gemini 1.5 Flash</Option>
                  </Select>
                </GridItem>

                <GridItem col={4}>
                  <Box>
                    <Typography variant="pi" fontWeight="bold" marginBottom={2}>
                      Test Aktion
                    </Typography>
                    <Button
                      variant="default"
                      startIcon={<Play />}
                      onClick={testPrompt}
                      loading={isLoading}
                      disabled={!promptTemplate.trim()}
                      size="L"
                      fullWidth
                    >
                      {isLoading ? 'Teste...' : 'Prompt testen'}
                    </Button>
                  </Box>
                </GridItem>
              </Grid>
            </Stack>
          </CardBody>
        </Card>

        {/* Results */}
        {results && (
          <Card>
            <CardBody>
              <Stack spacing={4}>
                <Stack spacing={2} horizontal>
                  <Typography variant="beta">Test Ergebnisse</Typography>
                  <Badge variant="success">
                    Kosten: {formatCost(results.totalCost)}
                  </Badge>
                </Stack>

                {/* Recommendation */}
                {results.comparison?.recommendation && (
                  <Alert variant="success" title="Empfehlung">
                    <Typography>
                      <strong>{results.comparison.recommendation.toUpperCase()}</strong> hat die beste Performance mit {results.comparison.bestScore} Punkten.
                    </Typography>
                  </Alert>
                )}

                {/* Provider Results */}
                <TabGroup>
                  <Tabs>
                    {Object.entries(results.results).map(([provider, result]) => (
                      <Tab key={provider}>
                        <Stack spacing={1} horizontal>
                          <Badge variant={getProviderBadgeColor(provider)}>
                            {provider.toUpperCase()}
                          </Badge>
                          {result.success ? (
                            <Badge variant="success">✓</Badge>
                          ) : (
                            <Badge variant="danger">✗</Badge>
                          )}
                        </Stack>
                      </Tab>
                    ))}
                  </Tabs>
                  
                  <TabPanels>
                    {Object.entries(results.results).map(([provider, result]) => (
                      <TabPanel key={provider}>
                        <Stack spacing={4}>
                          {result.success ? (
                            <>
                              {/* Response */}
                              <Box>
                                <Typography variant="epsilon" marginBottom={2}>
                                  AI Response
                                </Typography>
                                <Box
                                  padding={3}
                                  background="neutral100"
                                  borderRadius="4px"
                                  style={{ 
                                    whiteSpace: 'pre-line',
                                    maxHeight: '300px',
                                    overflowY: 'auto',
                                    fontSize: '14px',
                                    lineHeight: '1.5'
                                  }}
                                >
                                  {result.response}
                                </Box>
                              </Box>

                              {/* Metrics */}
                              <Grid gap={3}>
                                <GridItem col={3}>
                                  <Stack spacing={1}>
                                    <Typography variant="sigma">Performance</Typography>
                                    <Typography variant="pi">Model: {result.model}</Typography>
                                    <Typography variant="pi">Zeit: {formatDuration(result.duration)}</Typography>
                                    <Typography variant="pi">Kosten: {formatCost(result.cost)}</Typography>
                                  </Stack>
                                </GridItem>

                                {result.metrics && (
                                  <>
                                    <GridItem col={3}>
                                      <Stack spacing={1}>
                                        <Typography variant="sigma">Content</Typography>
                                        <Typography variant="pi">Wörter: {result.metrics.wordCount}</Typography>
                                        <Typography variant="pi">Sätze: {result.metrics.sentenceCount}</Typography>
                                        <Typography variant="pi">Absätze: {result.metrics.paragraphCount}</Typography>
                                      </Stack>
                                    </GridItem>

                                    <GridItem col={3}>
                                      <Stack spacing={1}>
                                        <Typography variant="sigma">Qualität</Typography>
                                        <Stack spacing={1} horizontal>
                                          <Typography variant="pi">Lesbarkeit:</Typography>
                                          <Badge variant={getQualityColor(result.metrics.readabilityScore)}>
                                            {result.metrics.readabilityScore}
                                          </Badge>
                                        </Stack>
                                        <Typography variant="pi">
                                          Struktur: {result.metrics.hasStructure ? '✓' : '✗'}
                                        </Typography>
                                        <Typography variant="pi">
                                          Professional: {result.metrics.professionalTone ? '✓' : '✗'}
                                        </Typography>
                                      </Stack>
                                    </GridItem>

                                    <GridItem col={3}>
                                      <Stack spacing={1}>
                                        <Typography variant="sigma">Features</Typography>
                                        <Typography variant="pi">
                                          Emojis: {result.metrics.hasEmojis ? '✓' : '✗'}
                                        </Typography>
                                        <Typography variant="pi">
                                          Next Steps: {result.metrics.includesNextSteps ? '✓' : '✗'}
                                        </Typography>
                                      </Stack>
                                    </GridItem>
                                  </>
                                )}
                              </Grid>
                            </>
                          ) : (
                            <Alert variant="danger" title="Fehler">
                              <Typography>{result.error}</Typography>
                            </Alert>
                          )}
                        </Stack>
                      </TabPanel>
                    ))}
                  </TabPanels>
                </TabGroup>
              </Stack>
            </CardBody>
          </Card>
        )}

        {/* Help */}
        <Card>
          <CardBody>
            <Stack spacing={3}>
              <Typography variant="beta">💡 Prompt Optimization Tipps</Typography>
              <Stack spacing={2}>
                <Typography variant="pi">
                  <strong>Template Variables:</strong> Verwenden Sie {{'{'}firstName{'}'}, {{'{'}leadScore{'}'}, {{'{'}responses{'}'}} für dynamische Inhalte
                </Typography>
                <Typography variant="pi">
                  <strong>Struktur:</strong> Nutzen Sie Emojis, Bullet Points und klare Abschnitte für bessere Lesbarkeit
                </Typography>
                <Typography variant="pi">
                  <strong>Call-to-Action:</strong> Fügen Sie konkrete nächste Schritte hinzu
                </Typography>
                <Typography variant="pi">
                  <strong>Länge:</strong> Optimal sind 100-300 Wörter für gute User Experience
                </Typography>
              </Stack>
            </Stack>
          </CardBody>
        </Card>
      </Stack>
    </Box>
  );
};

export default PromptTester;