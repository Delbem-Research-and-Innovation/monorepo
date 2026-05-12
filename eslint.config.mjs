import ttossEslintConfig from '@ttoss/eslint-config';

/**
 * Complexity rules applied to all source files.
 * Relaxed in test files (see override block below).
 */
const complexityRules = {
  complexity: ['error', 10],
  'max-depth': ['error', 4],
  'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
  'max-lines-per-function': [
    'error',
    { max: 80, skipBlankLines: true, skipComments: true },
  ],
  'max-nested-callbacks': ['error', 3],
  'max-params': ['error', 5],
};

export default [
  ...ttossEslintConfig,
  // Complexity limits — source files
  {
    rules: complexityRules,
  },
  // JSX/TSX components can be longer due to JSX verbosity
  {
    files: ['**/*.tsx', '**/*.jsx'],
    rules: {
      'max-lines-per-function': [
        'error',
        { max: 150, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  // Test files — all complexity limits relaxed
  {
    files: ['**/*.test.*', '**/*.spec.*'],
    rules: {
      complexity: 'off',
      'max-depth': 'off',
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'max-nested-callbacks': 'off',
      'max-params': 'off',
    },
  },
];
