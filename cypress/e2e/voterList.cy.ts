describe('Voter list from Dexie', () => {
  it('shows seeded voters', () => {
    cy.visit('/voters', {
      onBeforeLoad(win) {
        win.localStorage.setItem('loggedIn', 'true');
      },
    });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cy.window().then((win: any) => {
      return win.voterDB.voters.clear().then(() =>
        win.voterDB.voters.bulkAdd([
          {
            persona: { nombre: 'John', apellido: 'Doe', dni: '123' },
            personasVotantes: [{ numero_de_orden: 1, dni: '123', genero: 'M' }],
            fechaEnviado: new Date().toISOString(),
          },
        ])
      );
    });

    cy.reload();

    cy.contains('John Doe').should('exist');
  });
});
