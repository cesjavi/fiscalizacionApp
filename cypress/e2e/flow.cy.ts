describe('Authentication Flow', () => {
  beforeEach(() => {
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

  it('logs in with email', () => {
    cy.visit('/login');
    cy.get('ion-input[type="email"]').type('test@example.com');
    cy.get('ion-input[type="password"]').type('pass');
    cy.contains('button', 'INGRESAR').click();
    cy.url().should('include', '/fiscalizacion-lookup');
  });

  it('logs in with DNI', () => {
    cy.visit('/login');
    cy.get('ion-segment-button[value="dni"]').click();
    cy.get('ion-input').first().type('12345678');
    cy.get('ion-input[type="password"]').type('pass');
    cy.contains('button', 'INGRESAR').click();
    cy.url().should('include', '/fiscalizacion-lookup');
  });
});
