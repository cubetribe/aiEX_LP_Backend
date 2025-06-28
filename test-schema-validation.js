/**
 * Test Schema Validation
 */

const { validateCampaignConfig } = require('./src/utils/campaign-schemas');

// Test 1: Valid quiz configuration
console.log('=== TEST 1: Valid Quiz Configuration ===');
const validQuizConfig = {
  type: 'quiz',
  title: 'Test Quiz',
  description: 'A test quiz',
  questions: [
    {
      id: 'q1',
      question: 'What is your age?',
      type: 'single-choice',
      required: true,
      options: ['18-25', '26-35', '36-45', '45+']
    }
  ]
};

const result1 = validateCampaignConfig(validQuizConfig, 'quiz');
console.log('Valid config result:', result1.success);
if (!result1.success) {
  console.log('Errors:', result1.errors);
}

// Test 2: Invalid quiz configuration (missing required fields)
console.log('\n=== TEST 2: Invalid Quiz Configuration ===');
const invalidQuizConfig = {
  type: 'quiz',
  // title missing (required)
  questions: [
    {
      // id missing (required)
      question: 'Test question',
      type: 'invalid-type', // invalid type
      options: []
    }
  ]
};

const result2 = validateCampaignConfig(invalidQuizConfig, 'quiz');
console.log('Invalid config result:', result2.success);
if (!result2.success) {
  console.log('Validation errors:');
  result2.errors.forEach(error => {
    console.log(`  - ${error.path}: ${error.message}`);
  });
}

// Test 3: Quiz with conditional logic
console.log('\n=== TEST 3: Quiz with Conditional Logic ===');
const conditionalQuizConfig = {
  type: 'quiz',
  title: 'Conditional Quiz',
  questions: [
    {
      id: 'q1',
      question: 'Are you a student?',
      type: 'single-choice',
      options: ['yes', 'no']
    },
    {
      id: 'q2',
      question: 'What year are you in?',
      type: 'single-choice',
      options: ['1st', '2nd', '3rd', '4th'],
      conditional: {
        showIf: {
          field: 'q1',
          operator: 'equals',
          value: 'yes'
        }
      }
    }
  ],
  scoring: {
    logic: 'conditional',
    rules: [
      {
        if: { q1: 'yes' },
        then: { leadScore: 80, leadQuality: 'warm' }
      }
    ]
  }
};

const result3 = validateCampaignConfig(conditionalQuizConfig, 'quiz');
console.log('Conditional config result:', result3.success);
if (result3.success) {
  console.log('Validated with defaults applied:', result3.data.behavior);
} else {
  console.log('Errors:', result3.errors);
}

console.log('\n=== Schema Validation Tests Complete ===');