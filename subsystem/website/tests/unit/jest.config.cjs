const { jestUnitConfig } = require('@ttoss/config');

module.exports = jestUnitConfig({
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  moduleNameMapper: {
    '^next/cache$': '<rootDir>/mocks/next-cache.cjs',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!@ttoss/|\\.pnpm/)',
  ],
});
