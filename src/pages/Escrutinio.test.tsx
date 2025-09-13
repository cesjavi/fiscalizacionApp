import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { vi } from 'vitest';
import Escrutinio from './Escrutinio';
import { AuthProvider } from '../AuthContext';
import { FiscalDataProvider } from '../FiscalDataContext';

describe('Escrutinio', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  test('shows error if backend is unavailable', async () => {
    const history = createMemoryHistory({ initialEntries: ['/escrutinio'] });
    localStorage.setItem('fiscalData', '{}');

    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('backend down'));

    const { findByText } = render(
      <AuthProvider>
        <FiscalDataProvider>
          <Router history={history}>
            <Escrutinio />
          </Router>
        </FiscalDataProvider>
      </AuthProvider>
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/fiscalizacion/listarCandidatos',
      expect.any(Object)
    );
    expect(
      await findByText(/No se pudieron cargar las listas/i)
    ).toBeInTheDocument();
  });
});
