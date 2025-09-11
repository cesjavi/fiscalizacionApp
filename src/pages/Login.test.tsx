import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import Login from './Login';
import { AuthContext, AuthContextType } from '../AuthContext';
import { vi } from 'vitest';

const renderWithAuth = (authValue: Partial<AuthContextType> = {}) => {
  const defaultAuth: AuthContextType = {
    user: null,
    token: null,
    login: vi.fn().mockResolvedValue(undefined),
    loginWithDni: vi.fn().mockResolvedValue(undefined),
    loginWithGoogle: vi.fn().mockResolvedValue(undefined),
    register: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
    isAuthenticated: false,
  };
  const value = { ...defaultAuth, ...authValue } as AuthContextType;
  const history = createMemoryHistory({ initialEntries: ['/login'] });
  const utils = render(
    <AuthContext.Provider value={value}>
      <Router history={history}>
        <Login />
      </Router>
    </AuthContext.Provider>
  );
  return { ...utils, history, auth: value };
};

describe('Login', () => {
  test('calls loginWithGoogle when button is clicked', async () => {
    const { getByText, auth } = renderWithAuth();
    fireEvent.click(getByText('Ingresar con Google'));

    await waitFor(() => {
      expect(auth.loginWithGoogle).toHaveBeenCalled();
    });
  });
});
