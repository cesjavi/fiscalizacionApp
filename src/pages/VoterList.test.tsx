import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import VoterList from './VoterList';
import { AuthProvider } from '../AuthContext';
import { voterDB } from '../voterDB';

describe('VoterList', () => {
  beforeEach(async () => {
    await voterDB.voters.clear();
    await voterDB.voters.bulkAdd([
      {
        nombre: 'John',
        apellido: 'Doe',
        dni: '123',
        numero_de_orden: 1,
        genero: 'M',
        fechaEnviado: new Date().toISOString(),
      },
    ]);
  });

  it('loads voters from Dexie', async () => {
    const history = createMemoryHistory({ initialEntries: ['/voters'] });
    const { getAllByText } = render(
      <AuthProvider>
        <Router history={history}>
          <VoterList />
        </Router>
      </AuthProvider>
    );

    await waitFor(() => expect(getAllByText(/John/).length).toBeGreaterThan(0));
  });
});
