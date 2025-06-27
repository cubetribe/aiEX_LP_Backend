'use strict';

/**
 * Conditional Logic Template Library
 * Vorgefertigte JSON-Konfigurationen für verschiedene Use Cases
 */

const CONDITIONAL_LOGIC_TEMPLATES = {
  
  // Template 1: Privat vs. Gewerblich
  'privat-gewerblich': {
    name: 'Privat vs. Gewerblich',
    description: 'Unterschiedliche Fragenverläufe für Privatpersonen und Unternehmer',
    category: 'lead-qualification',
    config: {
      title: 'AI-Bedarfsanalyse',
      description: 'Finden Sie heraus, wie KI Ihnen helfen kann',
      questions: [
        {
          id: 'user_type',
          question: 'Sind Sie Privatperson oder Unternehmer?',
          type: 'single-choice',
          options: ['Privatperson', 'Unternehmer'],
          required: true,
          order: 1,
        },
        {
          id: 'company_size',
          question: 'Wie viele Mitarbeiter hat Ihr Unternehmen?',
          type: 'single-choice',
          options: ['1-10', '11-50', '51-200', '200+'],
          required: true,
          order: 2,
          conditional: {
            showIf: {
              field: 'user_type',
              operator: 'equals',
              value: 'Unternehmer'
            }
          }
        },
        {
          id: 'business_industry',
          question: 'In welcher Branche sind Sie tätig?',
          type: 'single-choice',
          options: ['Technologie', 'Handel', 'Dienstleistung', 'Produktion', 'Andere'],
          required: true,
          order: 3,
          conditional: {
            showIf: {
              field: 'user_type',
              operator: 'equals',
              value: 'Unternehmer'
            }
          }
        },
        {
          id: 'private_income',
          question: 'In welcher Einkommensklasse befinden Sie sich?',
          type: 'single-choice',
          options: ['Unter 30k', '30k-60k', '60k-100k', 'Über 100k'],
          required: true,
          order: 2,
          conditional: {
            showIf: {
              field: 'user_type',
              operator: 'equals',
              value: 'Privatperson'
            }
          }
        },
        {
          id: 'private_goal',
          question: 'Was ist Ihr Hauptziel mit KI?',
          type: 'single-choice',
          options: ['Weiterbildung', 'Karriere', 'Nebeneinkommen', 'Persönliche Projekte'],
          required: true,
          order: 3,
          conditional: {
            showIf: {
              field: 'user_type',
              operator: 'equals',
              value: 'Privatperson'
            }
          }
        },
        {
          id: 'ai_experience',
          question: 'Wie viel Erfahrung haben Sie mit KI-Tools?',
          type: 'single-choice',
          options: ['Keine', 'Wenig', 'Mittel', 'Viel'],
          required: true,
          order: 4,
        }
      ],
      scoring: {
        logic: 'conditional',
        rules: [
          {
            if: { user_type: 'Unternehmer', company_size: '200+' },
            then: { leadScore: 95, leadQuality: 'hot' }
          },
          {
            if: { user_type: 'Unternehmer', company_size: '51-200' },
            then: { leadScore: 80, leadQuality: 'hot' }
          },
          {
            if: { user_type: 'Unternehmer', company_size: '11-50' },
            then: { leadScore: 70, leadQuality: 'warm' }
          },
          {
            if: { user_type: 'Unternehmer', company_size: '1-10' },
            then: { leadScore: 60, leadQuality: 'warm' }
          },
          {
            if: { user_type: 'Privatperson', private_income: 'Über 100k' },
            then: { leadScore: 50, leadQuality: 'warm' }
          },
          {
            if: { user_type: 'Privatperson', private_income: '60k-100k' },
            then: { leadScore: 40, leadQuality: 'cold' }
          },
          {
            if: { user_type: 'Privatperson' },
            then: { leadScore: 35, leadQuality: 'cold' }
          }
        ],
        default: { leadScore: 50, leadQuality: 'warm' }
      },
      styling: {
        primaryColor: '#007bff',
        secondaryColor: '#6c757d'
      },
      behavior: {
        showProgress: true,
        allowBack: true,
        randomizeQuestions: false,
        conditionalLogic: true
      },
      resultDelivery: {
        mode: 'show_and_email',
        showOnScreen: true,
        sendEmail: true,
        emailRequired: false,
        pageTitle: 'Ihre AI-Bedarfsanalyse',
        pageSubtitle: 'Basierend auf Ihren Antworten haben wir eine personalisierte Empfehlung erstellt'
      }
    }
  },

  // Template 2: Budget-basierte Weiterleitung
  'budget-weiterleitung': {
    name: 'Budget-basierte Weiterleitung',
    description: 'Zeigt verschiedene Service-Optionen basierend auf Budget',
    category: 'service-selection',
    config: {
      title: 'Service-Auswahl',
      description: 'Finden Sie das passende Service-Paket für Ihr Budget',
      questions: [
        {
          id: 'budget',
          question: 'Welches Budget haben Sie für unser Service?',
          type: 'single-choice',
          options: ['Unter 1000€', '1000-5000€', '5000-20000€', 'Über 20000€'],
          required: true,
          order: 1
        },
        {
          id: 'timeline',
          question: 'Bis wann soll das Projekt fertig sein?',
          type: 'single-choice',
          options: ['Innerhalb 1 Monat', '1-3 Monate', '3-6 Monate', 'Über 6 Monate'],
          required: true,
          order: 2
        },
        {
          id: 'premium_features',
          question: 'Welche Premium-Features interessieren Sie?',
          type: 'multiple-choice',
          options: ['KI-Integration', 'Custom Development', '24/7 Support', 'Dedicated Manager', 'Priority Support'],
          required: true,
          order: 3,
          conditional: {
            showIf: {
              field: 'budget',
              operator: 'in',
              value: ['5000-20000€', 'Über 20000€']
            }
          }
        },
        {
          id: 'enterprise_requirements',
          question: 'Welche Enterprise-Features benötigen Sie?',
          type: 'multiple-choice',
          options: ['Single Sign-On', 'Advanced Analytics', 'Custom Integrations', 'White-Label Solution', 'SLA Garantie'],
          required: true,
          order: 4,
          conditional: {
            showIf: {
              field: 'budget',
              operator: 'equals',
              value: 'Über 20000€'
            }
          }
        },
        {
          id: 'basic_package',
          question: 'Welche Basis-Features sind wichtig?',
          type: 'multiple-choice',
          options: ['Standard Support', 'Basis-Setup', 'Dokumentation', 'Video-Tutorials'],
          required: true,
          order: 3,
          conditional: {
            showIf: {
              field: 'budget',
              operator: 'in',
              value: ['Unter 1000€', '1000-5000€']
            }
          }
        }
      ],
      scoring: {
        logic: 'conditional',
        rules: [
          {
            if: { budget: 'Über 20000€', timeline: 'Innerhalb 1 Monat' },
            then: { leadScore: 100, leadQuality: 'hot' }
          },
          {
            if: { budget: 'Über 20000€' },
            then: { leadScore: 95, leadQuality: 'hot' }
          },
          {
            if: { budget: '5000-20000€', timeline: 'Innerhalb 1 Monat' },
            then: { leadScore: 85, leadQuality: 'hot' }
          },
          {
            if: { budget: '5000-20000€' },
            then: { leadScore: 75, leadQuality: 'warm' }
          },
          {
            if: { budget: '1000-5000€' },
            then: { leadScore: 55, leadQuality: 'warm' }
          }
        ],
        default: { leadScore: 30, leadQuality: 'cold' }
      }
    }
  },

  // Template 3: Erfahrungsbasierte Empfehlungen
  'erfahrungs-assessment': {
    name: 'Tech-Expertise Assessment',
    description: 'Personalisierte Empfehlungen basierend auf technischer Erfahrung',
    category: 'skill-assessment',
    config: {
      title: 'Tech-Expertise Assessment',
      description: 'Erhalten Sie personalisierte AI-Tool-Empfehlungen',
      questions: [
        {
          id: 'experience',
          question: 'Wie viel Erfahrung haben Sie mit AI-Tools?',
          type: 'single-choice',
          options: ['Keine', 'Wenig', 'Mittel', 'Viel', 'Experte'],
          required: true,
          order: 1
        },
        {
          id: 'current_tools',
          question: 'Welche AI-Tools nutzen Sie bereits?',
          type: 'multiple-choice',
          options: ['ChatGPT', 'Claude', 'Midjourney', 'GitHub Copilot', 'Custom APIs'],
          required: false,
          order: 2,
          conditional: {
            showIf: {
              field: 'experience',
              operator: 'not_equals',
              value: 'Keine'
            }
          }
        },
        {
          id: 'advanced_tools',
          question: 'Welche fortgeschrittenen Tools kennen Sie?',
          type: 'multiple-choice',
          options: ['LangChain', 'Hugging Face', 'OpenAI API', 'Vector Databases', 'AI Training'],
          required: true,
          order: 3,
          conditional: {
            showIf: {
              field: 'experience',
              operator: 'in',
              value: ['Viel', 'Experte']
            }
          }
        },
        {
          id: 'beginner_interests',
          question: 'Was möchten Sie mit AI erreichen?',
          type: 'single-choice',
          options: ['Texte schreiben', 'Bilder erstellen', 'Daten analysieren', 'Automatisierung'],
          required: true,
          order: 3,
          conditional: {
            showIf: {
              field: 'experience',
              operator: 'in',
              value: ['Keine', 'Wenig']
            }
          }
        },
        {
          id: 'learning_preference',
          question: 'Wie lernen Sie am liebsten?',
          type: 'single-choice',
          options: ['Video-Tutorials', 'Hands-on Workshop', '1:1 Beratung', 'Dokumentation'],
          required: true,
          order: 4
        }
      ],
      scoring: {
        logic: 'conditional',
        rules: [
          {
            if: { experience: 'Experte', learning_preference: '1:1 Beratung' },
            then: { leadScore: 95, leadQuality: 'hot' }
          },
          {
            if: { experience: 'Experte' },
            then: { leadScore: 85, leadQuality: 'hot' }
          },
          {
            if: { experience: 'Viel' },
            then: { leadScore: 75, leadQuality: 'warm' }
          },
          {
            if: { experience: 'Keine', beginner_interests: 'Automatisierung' },
            then: { leadScore: 65, leadQuality: 'warm' }
          },
          {
            if: { experience: 'Keine', learning_preference: 'Hands-on Workshop' },
            then: { leadScore: 60, leadQuality: 'warm' }
          }
        ],
        default: { leadScore: 45, leadQuality: 'cold' }
      }
    }
  },

  // Template 4: E-Commerce Produkt-Finder
  'product-finder': {
    name: 'E-Commerce Produkt-Finder',
    description: 'Hilft Kunden, das richtige Produkt zu finden',
    category: 'product-recommendation',
    config: {
      title: 'Produkt-Finder',
      description: 'Finden Sie das perfekte Produkt für Ihre Bedürfnisse',
      questions: [
        {
          id: 'category',
          question: 'Welche Produktkategorie interessiert Sie?',
          type: 'single-choice',
          options: ['Smartphones', 'Laptops', 'Tablets', 'Audio-Geräte', 'Smart Home'],
          required: true,
          order: 1
        },
        {
          id: 'smartphone_usage',
          question: 'Wofür nutzen Sie Ihr Smartphone hauptsächlich?',
          type: 'single-choice',
          options: ['Alltag & Social Media', 'Fotografie', 'Gaming', 'Business', 'Media Consumption'],
          required: true,
          order: 2,
          conditional: {
            showIf: {
              field: 'category',
              operator: 'equals',
              value: 'Smartphones'
            }
          }
        },
        {
          id: 'laptop_usage',
          question: 'Wofür benötigen Sie den Laptop?',
          type: 'single-choice',
          options: ['Office & Web', 'Content Creation', 'Gaming', 'Programming', 'Design'],
          required: true,
          order: 2,
          conditional: {
            showIf: {
              field: 'category',
              operator: 'equals',
              value: 'Laptops'
            }
          }
        },
        {
          id: 'budget_range',
          question: 'Welches Budget haben Sie?',
          type: 'single-choice',
          options: ['Unter 500€', '500-1000€', '1000-2000€', 'Über 2000€'],
          required: true,
          order: 3
        },
        {
          id: 'premium_features',
          question: 'Welche Premium-Features sind wichtig?',
          type: 'multiple-choice',
          options: ['5G', 'Wireless Charging', '120Hz Display', 'ProRAW Fotografie', 'Face ID'],
          required: false,
          order: 4,
          conditional: {
            showIf: {
              field: 'budget_range',
              operator: 'in',
              value: ['1000-2000€', 'Über 2000€']
            }
          }
        }
      ],
      scoring: {
        logic: 'conditional',
        rules: [
          {
            if: { budget_range: 'Über 2000€' },
            then: { leadScore: 90, leadQuality: 'hot' }
          },
          {
            if: { budget_range: '1000-2000€', category: 'Smartphones' },
            then: { leadScore: 75, leadQuality: 'warm' }
          },
          {
            if: { budget_range: '500-1000€' },
            then: { leadScore: 60, leadQuality: 'warm' }
          }
        ],
        default: { leadScore: 40, leadQuality: 'cold' }
      }
    }
  },

  // Template 5: Fitness-Programm-Auswahl
  'fitness-program': {
    name: 'Fitness-Programm-Auswahl',
    description: 'Personalisierte Fitness-Programm-Empfehlungen',
    category: 'health-fitness',
    config: {
      title: 'Fitness-Programm-Finder',
      description: 'Finden Sie das perfekte Fitnessprogramm',
      questions: [
        {
          id: 'fitness_level',
          question: 'Wie würden Sie Ihr aktuelles Fitness-Level einschätzen?',
          type: 'single-choice',
          options: ['Anfänger', 'Fortgeschritten', 'Experte', 'Athlet'],
          required: true,
          order: 1
        },
        {
          id: 'goals',
          question: 'Was ist Ihr Hauptziel?',
          type: 'single-choice',
          options: ['Abnehmen', 'Muskeln aufbauen', 'Ausdauer verbessern', 'Beweglichkeit', 'Gesundheit'],
          required: true,
          order: 2
        },
        {
          id: 'time_availability',
          question: 'Wie viel Zeit können Sie pro Woche investieren?',
          type: 'single-choice',
          options: ['1-2 Stunden', '3-4 Stunden', '5-6 Stunden', 'Mehr als 6 Stunden'],
          required: true,
          order: 3
        },
        {
          id: 'advanced_training',
          question: 'Welche fortgeschrittenen Trainingsmethoden interessieren Sie?',
          type: 'multiple-choice',
          options: ['HIIT', 'Krafttraining', 'Functional Training', 'Yoga', 'Crossfit'],
          required: true,
          order: 4,
          conditional: {
            showIf: {
              field: 'fitness_level',
              operator: 'in',
              value: ['Fortgeschritten', 'Experte', 'Athlet']
            }
          }
        },
        {
          id: 'beginner_preferences',
          question: 'Womit möchten Sie anfangen?',
          type: 'single-choice',
          options: ['Spazieren/Joggen', 'Bodyweight Übungen', 'Gym Training', 'Online Kurse'],
          required: true,
          order: 4,
          conditional: {
            showIf: {
              field: 'fitness_level',
              operator: 'equals',
              value: 'Anfänger'
            }
          }
        }
      ],
      scoring: {
        logic: 'conditional',
        rules: [
          {
            if: { fitness_level: 'Athlet', time_availability: 'Mehr als 6 Stunden' },
            then: { leadScore: 95, leadQuality: 'hot' }
          },
          {
            if: { fitness_level: 'Experte', time_availability: '5-6 Stunden' },
            then: { leadScore: 85, leadQuality: 'hot' }
          },
          {
            if: { goals: 'Muskeln aufbauen', time_availability: '5-6 Stunden' },
            then: { leadScore: 80, leadQuality: 'warm' }
          },
          {
            if: { fitness_level: 'Anfänger', time_availability: '3-4 Stunden' },
            then: { leadScore: 70, leadQuality: 'warm' }
          }
        ],
        default: { leadScore: 50, leadQuality: 'warm' }
      }
    }
  }
};

/**
 * Get all available templates
 */
function getAllTemplates() {
  return Object.keys(CONDITIONAL_LOGIC_TEMPLATES).map(key => ({
    id: key,
    ...CONDITIONAL_LOGIC_TEMPLATES[key]
  }));
}

/**
 * Get template by ID
 */
function getTemplate(templateId) {
  return CONDITIONAL_LOGIC_TEMPLATES[templateId] || null;
}

/**
 * Get templates by category
 */
function getTemplatesByCategory(category) {
  return Object.keys(CONDITIONAL_LOGIC_TEMPLATES)
    .filter(key => CONDITIONAL_LOGIC_TEMPLATES[key].category === category)
    .map(key => ({
      id: key,
      ...CONDITIONAL_LOGIC_TEMPLATES[key]
    }));
}

/**
 * Get template categories
 */
function getCategories() {
  const categories = new Set();
  Object.values(CONDITIONAL_LOGIC_TEMPLATES).forEach(template => {
    categories.add(template.category);
  });
  return Array.from(categories);
}

/**
 * Validate template configuration
 */
function validateTemplate(config) {
  const errors = [];
  
  // Check required fields
  if (!config.title) errors.push('Title is required');
  if (!config.questions || !Array.isArray(config.questions)) {
    errors.push('Questions array is required');
  }
  
  // Validate questions
  if (config.questions) {
    const questionIds = new Set();
    config.questions.forEach((question, index) => {
      if (!question.id) {
        errors.push(`Question ${index + 1}: ID is required`);
      } else if (questionIds.has(question.id)) {
        errors.push(`Question ${index + 1}: Duplicate ID "${question.id}"`);
      } else {
        questionIds.add(question.id);
      }
      
      // Validate conditional logic
      if (question.conditional && question.conditional.showIf) {
        const { field, operator, value } = question.conditional.showIf;
        if (!field) errors.push(`Question ${question.id}: Conditional field is required`);
        if (!operator) errors.push(`Question ${question.id}: Conditional operator is required`);
        if (value === undefined) errors.push(`Question ${question.id}: Conditional value is required`);
        
        // Check if referenced field exists
        if (field && !questionIds.has(field)) {
          errors.push(`Question ${question.id}: Referenced field "${field}" does not exist`);
        }
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  CONDITIONAL_LOGIC_TEMPLATES,
  getAllTemplates,
  getTemplate,
  getTemplatesByCategory,
  getCategories,
  validateTemplate
};