import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
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
        establecimiento: { seccion: '', circuito: '', mesa: '' },
        persona: { nombre: 'John', apellido: 'Doe', dni: '123' },
        personasVotantes: [
          {
            numero_de_orden: 1,
            dni: '123',
            genero: 'M'
          }
        ],
        fechaEnviado: new Date().toISOString(),
        voto: false,
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

  it('marks voter as voto when button is clicked', async () => {
    const history = createMemoryHistory({ initialEntries: ['/voters'] });
    const { getByTestId, queryByText, getAllByText } = render(
      <AuthProvider>
        <Router history={history}>
          <VoterList />
        </Router>
      </AuthProvider>
    );

    await waitFor(() => expect(getAllByText(/John/).length).toBeGreaterThan(0));
    expect(queryByText('Votó')).toBeNull();

    const toggleBtn = getByTestId('toggle-vote');
    fireEvent.click(toggleBtn);

    await waitFor(() => expect(getAllByText('Votó').length).toBeGreaterThan(0));
    const row = getByTestId('voter-row-0');
    expect(row.className).toContain('bg-green-50');
  });
});
