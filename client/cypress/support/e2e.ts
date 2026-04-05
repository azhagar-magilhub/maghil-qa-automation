// ***********************************************************
// This support file is processed and loaded automatically before
// your test files.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands (add custom commands here as needed)
// import './commands'

// Prevent uncaught exceptions from failing tests
Cypress.on('uncaught:exception', () => {
  // Returning false here prevents Cypress from failing the test
  return false
})
