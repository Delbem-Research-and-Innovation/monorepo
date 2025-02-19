import ttossEslintConfig from '@ttoss/eslint-config';

export default [
  ...ttossEslintConfig,
  {
    rules: {
      'import/no-default-export': 'off',
    },
  },
];
