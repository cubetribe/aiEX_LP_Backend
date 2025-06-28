import React, { useState } from 'react';
import { Box, Typography, Button, Grid, Card, CardBody, CardContent, CardHeader, CardTitle } from '@strapi/design-system';
import { Layer } from '@strapi/icons';

const templates = {
  leadQualification: {
    name: "Lead Qualification Quiz",
    description: "Qualify leads based on business type and size",
    config: {
      type: "quiz",
      title: "Business Assessment",
      questions: [
        {
          id: "q1",
          question: "What best describes you?",
          type: "single-choice",
          options: ["Business Owner", "Employee", "Freelancer", "Student"]
        },
        {
          id: "q2",
          question: "How many employees do you have?",
          type: "single-choice",
          options: ["1-10", "11-50", "51-200", "200+"],
          conditional: {
            showIf: {
              field: "q1",
              operator: "equals",
              value: "Business Owner"
            }
          }
        }
      ],
      scoring: {
        logic: "conditional",
        rules: [
          {
            if: { q1: "Business Owner", q2: "200+" },
            then: { leadScore: 95, leadQuality: "hot" }
          },
          {
            if: { q1: "Business Owner" },
            then: { leadScore: 75, leadQuality: "warm" }
          }
        ]
      }
    }
  },
  satisfaction: {
    name: "Customer Satisfaction Survey",
    description: "Measure customer satisfaction with ratings",
    config: {
      type: "quiz",
      title: "How was your experience?",
      questions: [
        {
          id: "q1",
          question: "How satisfied are you with our service?",
          type: "rating",
          scale: 10
        },
        {
          id: "q2",
          question: "Would you recommend us to others?",
          type: "single-choice",
          options: ["Definitely", "Probably", "Not sure", "Probably not", "Definitely not"]
        }
      ]
    }
  }
};

const TemplateSelector = ({ onSelect }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const handleSelect = (templateKey) => {
    const template = templates[templateKey];
    setSelectedTemplate(templateKey);
    if (onSelect) {
      onSelect(template.config);
    }
  };

  return (
    <Box>
      <Typography variant="beta" marginBottom={4}>
        🎨 Campaign Templates
      </Typography>
      
      <Grid gap={4}>
        {Object.entries(templates).map(([key, template]) => (
          <Card 
            key={key}
            style={{ 
              cursor: 'pointer',
              border: selectedTemplate === key ? '2px solid #4945ff' : '1px solid #ddd'
            }}
            onClick={() => handleSelect(key)}
          >
            <CardHeader>
              <CardTitle>{template.name}</CardTitle>
            </CardHeader>
            <CardBody>
              <CardContent>
                <Typography variant="omega">{template.description}</Typography>
              </CardContent>
            </CardBody>
          </Card>
        ))}
      </Grid>

      {selectedTemplate && (
        <Box marginTop={4} padding={4} background="primary100" hasRadius>
          <Typography variant="pi">
            ✅ Template loaded! The configuration has been applied to the JSON Code field.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default TemplateSelector;