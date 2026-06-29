import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3001",
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.ts",
    video: false,
    // Keep the run deterministic and fast for a take-home.
    defaultCommandTimeout: 4000,
    requestTimeout: 4000,
  },
});
