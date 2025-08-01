describe('Full Voting Flow', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.clearLocalStorage();
  });

  it('registers a new user', () => {
    cy.visit('/register');
    cy.get('ion-input[type="email"]').type('test@example.com');
    cy.get('ion-input').eq(1).type('12345678');
    cy.get('ion-input[type="password"]').type('pass');
    cy.contains('button', 'Registrarse').click();
    cy.url().should('include', '/login');
  });

  it('logs in and completes flow', () => {
    cy.visit('/login');
    cy.get('ion-input').first().type('12345678');
    cy.get('ion-input[type="password"]').type('pass');
    cy.contains('button', 'INGRESAR').click();
    cy.url().should('include', '/mesas');

    cy.contains('Mesa 1').click();
    cy.url().should('include', '/vote');

    cy.get('ion-select').click();
    cy.get('ion-select-option').first().click();
    cy.contains('button', 'Submit Vote').click();
    cy.url().should('include', '/voter');

    cy.get('input').first().type('John');
    cy.get('input').last().type('123');
    cy.contains('button', 'Save Details').click();
  });
});
