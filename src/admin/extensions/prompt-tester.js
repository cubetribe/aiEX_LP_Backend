import React, { useState } from 'react';
import { Button, Box, Typography, TextInput, Textarea, Select, Option, Grid, Badge } from '@strapi/design-system';
import { Play, Loader, Check, X } from '@strapi/icons';

const PromptTester = () => {
  const [prompt, setPrompt] = useState('');
  const [provider, setProvider] = useState('openai');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [providerStatus, setProviderStatus] = useState({});

  const testPrompt = async () => {
    setLoading(true);
    try {
      const response = await fetch('/ai/test-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, provider })
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Test failed:', error);
    }
    setLoading(false);
  };

  const checkStatus = async () => {
    try {
      const response = await fetch('/ai/status');
      const data = await response.json();
      setProviderStatus(data.providers || {});
    } catch (error) {
      console.error('Status check failed:', error);
    }
  };

  React.useEffect(() => {
    checkStatus();
  }, []);

  return (
    <Box padding={8} background="neutral0" hasRadius>
      <Typography variant="alpha" marginBottom={6}>
        🤖 AI Prompt Tester
      </Typography>
      
      <Grid gap={4}>
        <Box>
          <Typography variant="beta" marginBottom={2}>Provider Status</Typography>
          <Box display="flex" gap={2}>
            {Object.entries(providerStatus).map(([name, status]) => (
              <Badge key={name} active={status}>
                {status ? <Check /> : <X />} {name}
              </Badge>
            ))}
          </Box>
        </Box>

        <Box>
          <Select
            label="AI Provider"
            value={provider}
            onChange={setProvider}
            marginBottom={4}
          >
            <Option value="openai">OpenAI GPT-4</Option>
            <Option value="anthropic">Anthropic Claude</Option>
            <Option value="gemini">Google Gemini</Option>
            <Option value="all">Test All Providers</Option>
          </Select>
        </Box>

        <Box>
          <Textarea
            label="Test Prompt"
            name="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
            rows={6}
          />
        </Box>

        <Box>
          <Button
            onClick={testPrompt}
            loading={loading}
            disabled={!prompt || loading}
            startIcon={<Play />}
            variant="primary"
            fullWidth
          >
            Test Prompt
          </Button>
        </Box>

        {results && (
          <Box marginTop={4} padding={4} background="neutral100" hasRadius>
            <Typography variant="omega" fontWeight="bold">Results:</Typography>
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>
              {JSON.stringify(results, null, 2)}
            </pre>
          </Box>
        )}
      </Grid>
    </Box>
  );
};

export default PromptTester;