const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8080',
    supportFile: 'cypress/support/e2e.js',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    // CI-specific configuration
    video: false,
    screenshotOnRunFailure: true,
    waitForAnimations: false,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    // Don't exit on first failure in CI
    exitOnFirstFailure: false,
  },
});
