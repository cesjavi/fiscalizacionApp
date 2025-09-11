import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import VoterList from './VoterList';
import { AuthProvider } from '../AuthContext';
import { voterDB } from '../voterDB';
import { vi, afterEach } from 'vitest';
import { Camera } from '@capacitor/camera';
import type { CameraPhoto } from '@capacitor/camera';
import { FiscalDataProvider } from '../FiscalDataContext';

describe('VoterList', () => {
  beforeEach(async () => {
    localStorage.removeItem('votingFrozen');
    localStorage.setItem('fiscalData', '{}');
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

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.removeItem('fiscalData');
  });

  it('loads voters from Dexie', async () => {
    const history = createMemoryHistory({ initialEntries: ['/voters'] });
    const { getAllByText } = render(
      <AuthProvider>
        <FiscalDataProvider>
          <Router history={history}>
            <VoterList />
          </Router>
        </FiscalDataProvider>
      </AuthProvider>
    );

    await waitFor(() => expect(getAllByText(/John/).length).toBeGreaterThan(0));
  });

  it('marks voter as voto when button is clicked', async () => {
    const history = createMemoryHistory({ initialEntries: ['/voters'] });
    const { getByTestId, getAllByText, queryAllByText } = render(
      <AuthProvider>
        <FiscalDataProvider>
          <Router history={history}>
            <VoterList />
          </Router>
        </FiscalDataProvider>
      </AuthProvider>
    );

    await waitFor(() => expect(getAllByText(/John/).length).toBeGreaterThan(0));
    expect(queryAllByText('Votó').length).toBe(0);

    const toggleBtn = getByTestId('toggle-vote');
    fireEvent.click(toggleBtn);

    await waitFor(() =>
      expect(getAllByText('Votó').length).toBeGreaterThan(0)
    );
    const row = getByTestId('voter-row-0');
    expect(row.className).toContain('bg-green-50');
  });

  it('remains on /voters after ending voting', async () => {
    const history = createMemoryHistory({ initialEntries: ['/voters'] });
    (Camera as unknown as { getPhoto: () => Promise<CameraPhoto> }).getPhoto = vi
      .fn()
      .mockResolvedValue({ dataUrl: 'mock' } as CameraPhoto);
    const { getByText } = render(
      <AuthProvider>
        <FiscalDataProvider>
          <Router history={history}>
            <VoterList />
          </Router>
        </FiscalDataProvider>
      </AuthProvider>
    );

    const endBtn = getByText('Terminar Votación');
    fireEvent.click(endBtn);

    await waitFor(() => expect(history.location.pathname).toBe('/voters'));
  });

  it('disables actions when voting is frozen', async () => {
    localStorage.setItem('votingFrozen', 'true');
    const history = createMemoryHistory({ initialEntries: ['/voters'] });
    const { getByTestId, getByText } = render(
      <AuthProvider>
        <FiscalDataProvider>
          <Router history={history}>
            <VoterList />
          </Router>
        </FiscalDataProvider>
      </AuthProvider>
    );

    await waitFor(() => getByTestId('voter-row-0'));
    expect(getByTestId('toggle-vote')).toBeDisabled();
    expect(getByText('Editar')).toBeDisabled();
    expect(getByText('Eliminar')).toBeDisabled();
  });

  it('unfreezes voting and re-enables actions', async () => {
    localStorage.setItem('votingFrozen', 'true');
    const history = createMemoryHistory({ initialEntries: ['/voters'] });
    window.confirm = vi.fn(() => true);
    const { getByTestId, getByText, queryByTestId, getAllByText } = render(
      <AuthProvider>
        <FiscalDataProvider>
          <Router history={history}>
            <VoterList />
          </Router>
        </FiscalDataProvider>
      </AuthProvider>
    );

    await waitFor(() => getByTestId('voter-row-0'));
    const toggleBtn = getByTestId('toggle-vote');
    const deleteBtn = getByText('Eliminar');
    expect(toggleBtn).toBeDisabled();
    expect(deleteBtn).toBeDisabled();

    const unfreezeBtn = getByText('Descongelar Votación');
    fireEvent.click(unfreezeBtn);

    await waitFor(() => expect(toggleBtn).not.toBeDisabled());
    await waitFor(() => expect(deleteBtn).not.toBeDisabled());

    fireEvent.click(toggleBtn);
    await waitFor(() => expect(getAllByText('Votó').length).toBeGreaterThan(0));

    fireEvent.click(deleteBtn);
    await waitFor(() => expect(queryByTestId('voter-row-0')).toBeNull());
  });
});
