import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import AddVoter from './AddVoter';
import { AuthProvider } from '../AuthContext';
import { voterDB } from '../voterDB';
import { vi } from 'vitest';
import { FiscalDataProvider } from '../FiscalDataContext';

describe('AddVoter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.removeItem('fiscalData');
    return voterDB.delete();
  });

  test('redirects to /voters on successful submit', async () => {
    const history = createMemoryHistory({ initialEntries: ['/add-voter'] });
    localStorage.setItem('fiscalData', '{}');

    const { container } = render(
      <AuthProvider>
        <FiscalDataProvider>
          <Router history={history}>
            <AddVoter />
          </Router>
        </FiscalDataProvider>
      </AuthProvider>
    );

    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(async () => expect(await voterDB.voters.count()).toBe(1));
    expect(history.location.pathname).toBe('/voters');
  });

  test('shows alert on failure and stays on page', async () => {
    const history = createMemoryHistory({ initialEntries: ['/add-voter'] });
    localStorage.setItem('fiscalData', '{}');
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(voterDB.voters, 'add').mockRejectedValue(new Error('Bad'));

    const { container } = render(
      <AuthProvider>
        <FiscalDataProvider>
          <Router history={history}>
            <AddVoter />
          </Router>
        </FiscalDataProvider>
      </AuthProvider>
    );

    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Error al guardar votante'));
    expect(history.location.pathname).toBe('/add-voter');
  });
});
