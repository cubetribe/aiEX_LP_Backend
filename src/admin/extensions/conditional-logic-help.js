import React, { useState } from 'react';
import { Box, Typography, Accordion, AccordionToggle, AccordionContent, Code } from '@strapi/design-system';

const ConditionalLogicHelp = () => {
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <Box padding={4} background="neutral100" hasRadius className="conditional-logic-help">
      <Typography variant="beta" marginBottom={4}>
        📚 Conditional Logic Guide
      </Typography>

      <Accordion expanded={expandedSection === 'basics'} toggle={() => toggleSection('basics')}>
        <AccordionToggle title="Basic Structure" />
        <AccordionContent>
          <Typography marginBottom={2}>
            Define dynamic question flows based on user responses:
          </Typography>
          <Code>
{`{
  "questions": [{
    "id": "q1",
    "question": "Are you a business owner?",
    "type": "single-choice",
    "options": ["Yes", "No"],
    "conditional": {
      "showIf": {
        "field": "q0",
        "operator": "equals",
        "value": "business"
      }
    }
  }]
}`}
          </Code>
        </AccordionContent>
      </Accordion>

      <Accordion expanded={expandedSection === 'operators'} toggle={() => toggleSection('operators')}>
        <AccordionToggle title="Available Operators" />
        <AccordionContent>
          <Box marginBottom={2}>
            <Typography fontWeight="bold">equals</Typography>
            <Typography variant="pi">Exact match comparison</Typography>
          </Box>
          <Box marginBottom={2}>
            <Typography fontWeight="bold">not_equals</Typography>
            <Typography variant="pi">Not equal comparison</Typography>
          </Box>
          <Box marginBottom={2}>
            <Typography fontWeight="bold">in</Typography>
            <Typography variant="pi">Value is in array</Typography>
          </Box>
          <Box marginBottom={2}>
            <Typography fontWeight="bold">greater_than / less_than</Typography>
            <Typography variant="pi">Numeric comparisons</Typography>
          </Box>
        </AccordionContent>
      </Accordion>

      <Accordion expanded={expandedSection === 'scoring'} toggle={() => toggleSection('scoring')}>
        <AccordionToggle title="Lead Scoring Rules" />
        <AccordionContent>
          <Typography marginBottom={2}>
            Configure automatic lead scoring based on responses:
          </Typography>
          <Code>
{`{
  "scoring": {
    "logic": "conditional",
    "rules": [{
      "if": { "type": "Unternehmer" },
      "then": { 
        "leadScore": 80, 
        "leadQuality": "hot" 
      }
    }]
  }
}`}
          </Code>
          <Box marginTop={2}>
            <Typography variant="pi">
              • Hot: 80-100 points<br/>
              • Warm: 60-79 points<br/>
              • Cold: 40-59 points<br/>
              • Unqualified: 0-39 points
            </Typography>
          </Box>
        </AccordionContent>
      </Accordion>

      <Box marginTop={4} padding={3} background="primary100" hasRadius>
        <Typography variant="pi" fontWeight="bold">
          💡 Pro Tip: Use the Template Selector to quickly load pre-configured conditional logic patterns!
        </Typography>
      </Box>
    </Box>
  );
};

export default ConditionalLogicHelp;