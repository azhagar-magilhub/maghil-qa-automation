describe('Smoke Tests', () => {
  it('login page loads and displays form', () => {
    cy.visit('/login')

    // Verify the page has the sign-in heading
    cy.contains('h2', 'Sign In').should('be.visible')

    // Verify form fields exist
    cy.get('input[type="email"]').should('be.visible')
    cy.get('input[type="password"]').should('be.visible')

    // Verify submit button
    cy.get('button[type="submit"]').should('be.visible')
  })

  it('register page loads and displays form', () => {
    cy.visit('/register')

    // Verify the page has the create account heading
    cy.contains('h2', 'Create Account').should('be.visible')

    // Verify form fields exist
    cy.get('input[type="text"]').should('be.visible')
    cy.get('input[type="email"]').should('be.visible')
    cy.get('input[type="password"]').should('have.length.at.least', 2)

    // Verify submit button
    cy.get('button[type="submit"]').should('be.visible')
  })

  it('page has correct title', () => {
    cy.visit('/login')
    cy.title().should('not.be.empty')
  })
})
