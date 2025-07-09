describe('Full Voting Flow', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.clearLocalStorage();
  });

  it('registers a new user', () => {
    cy.visit('/register');
    cy.get('input[ng-model], ion-input').first().type('testuser');
    cy.get('input[type="password"], ion-input[type="password"]').type('pass');
    cy.contains('button', 'Register').click();
    cy.url().should('include', '/login');
    cy.window().then(win => {
      expect(win.localStorage.getItem('users')).to.contain('testuser');
    });
  });

  it('logs in and completes flow', () => {
    cy.visit('/login');
    cy.get('input').first().type('testuser');
    cy.get('input[type="password"], ion-input[type="password"]').type('pass');
    cy.contains('button', 'Login').click();
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

    cy.window().then(win => {
      expect(win.localStorage.getItem('selectedMesa')).to.eq('1');
      expect(win.localStorage.getItem('vote')).to.not.equal(null);
      expect(win.localStorage.getItem('voterName')).to.eq('John');
      expect(win.localStorage.getItem('voterId')).to.eq('123');
    });
  });
});
