/**
 * GoAIX ESLint Configuration
 * Comprehensive linting rules for Node.js/Strapi application
 */

module.exports = {
  env: {
    browser: false,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    '@eslint/js/recommended',
    'plugin:node/recommended',
    'plugin:security/recommended',
    'prettier',
  ],
  plugins: ['node', 'security', 'prettier'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    // Prettier integration
    'prettier/prettier': 'error',

    // Error prevention
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-var': 'error',
    'prefer-const': 'error',
    'no-duplicate-imports': 'error',

    // Code quality
    'complexity': ['warn', 10],
    'max-depth': ['warn', 4],
    'max-lines': ['warn', 500],
    'max-lines-per-function': ['warn', 50],
    'max-params': ['warn', 4],

    // Security rules
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'error',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-new-buffer': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-non-literal-require': 'warn',
    'security/detect-object-injection': 'warn',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-pseudoRandomBytes': 'error',
    'security/detect-unsafe-regex': 'error',

    // Node.js specific
    'node/no-missing-import': 'off', // Strapi has special module resolution
    'node/no-unsupported-features/es-syntax': 'off',
    'node/no-unpublished-require': 'off',
    'node/exports-style': ['error', 'module.exports'],
    'node/file-extension-in-import': ['error', 'always', { '.js': 'never' }],
    'node/prefer-global/buffer': ['error', 'always'],
    'node/prefer-global/console': ['error', 'always'],
    'node/prefer-global/process': ['error', 'always'],
    'node/prefer-global/url-search-params': ['error', 'always'],
    'node/prefer-global/url': ['error', 'always'],
    'node/prefer-promises/dns': 'error',
    'node/prefer-promises/fs': 'error',

    // Style and formatting
    'camelcase': ['error', { properties: 'never' }],
    'consistent-return': 'error',
    'curly': ['error', 'all'],
    'eqeqeq': ['error', 'always', { null: 'ignore' }],
    'no-else-return': 'error',
    'no-lonely-if': 'error',
    'no-multi-assign': 'error',
    'no-nested-ternary': 'error',
    'no-unneeded-ternary': 'error',
    'object-shorthand': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-destructuring': ['error', { object: true, array: false }],
    'prefer-template': 'error',
    'spaced-comment': ['error', 'always'],

    // Promise and async handling
    'no-async-promise-executor': 'error',
    'no-await-in-loop': 'warn',
    'no-promise-executor-return': 'error',
    'prefer-promise-reject-errors': 'error',
    'require-atomic-updates': 'error',

    // Error handling
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error',

    // Performance
    'no-loop-func': 'error',
    'no-caller': 'error',
    'no-extend-native': 'error',
    'no-extra-bind': 'error',
    'no-implied-eval': 'error',
    'no-iterator': 'error',
    'no-labels': 'error',
    'no-lone-blocks': 'error',
    'no-new-func': 'error',
    'no-new-wrappers': 'error',
    'no-proto': 'error',
    'no-return-assign': 'error',
    'no-script-url': 'error',
    'no-self-compare': 'error',
    'no-sequences': 'error',
    'no-unused-expressions': 'error',
    'no-useless-call': 'error',
    'no-useless-concat': 'error',
    'no-void': 'error',
    'radix': 'error',
    'wrap-iife': ['error', 'inside'],
    'yoda': 'error',
  },
  overrides: [
    // Configuration files
    {
      files: ['*.config.js', 'config/**/*.js'],
      rules: {
        'no-console': 'off',
        'node/no-unpublished-require': 'off',
      },
    },
    // Test files
    {
      files: ['**/*.test.js', '**/*.spec.js', 'tests/**/*.js'],
      env: {
        jest: true,
      },
      rules: {
        'no-console': 'off',
        'max-lines-per-function': 'off',
        'security/detect-non-literal-fs-filename': 'off',
        'security/detect-object-injection': 'off',
      },
    },
    // Strapi files
    {
      files: ['src/api/**/*.js', 'src/extensions/**/*.js'],
      rules: {
        'node/no-missing-require': 'off',
        'node/no-unpublished-require': 'off',
      },
    },
    // Scripts
    {
      files: ['scripts/**/*.js'],
      rules: {
        'no-console': 'off',
        'node/no-unpublished-require': 'off',
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'build/',
    'dist/',
    '.cache/',
    '.tmp/',
    'coverage/',
    '*.min.js',
  ],
};