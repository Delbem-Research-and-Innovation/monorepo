const { jestUnitConfig } = require('@ttoss/config');

module.exports = jestUnitConfig({
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
});
