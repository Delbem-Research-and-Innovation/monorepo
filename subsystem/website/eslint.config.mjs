import ttossEslintConfig from '@ttoss/eslint-config';

export default [
  {
    ignores: ['.next/**'],
  },
  ...ttossEslintConfig,
  {
    rules: {
      'import/no-default-export': 'off',
    },
  },
  {
    files: ['**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
