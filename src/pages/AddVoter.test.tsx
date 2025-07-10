import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import AddVoter from './AddVoter';
import { AuthProvider } from '../AuthContext';
import { vi } from 'vitest';

describe('AddVoter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('redirects to /voters on successful submit', async () => {
    const history = createMemoryHistory({ initialEntries: ['/add-voter'] });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    const { container } = render(
      <AuthProvider>
        <Router history={history}>
          <AddVoter />
        </Router>
      </AuthProvider>
    );

    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(history.location.pathname).toBe('/voters');
  });

  test('shows alert on failure and stays on page', async () => {
    const history = createMemoryHistory({ initialEntries: ['/add-voter'] });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, statusText: 'Bad' }));
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { container } = render(
      <AuthProvider>
        <Router history={history}>
          <AddVoter />
        </Router>
      </AuthProvider>
    );

    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Bad'));
    expect(history.location.pathname).toBe('/add-voter');
  });
});
