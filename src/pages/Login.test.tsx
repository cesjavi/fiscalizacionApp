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
    login: vi.fn().mockResolvedValue(undefined),
    loginWithDni: vi.fn().mockResolvedValue(undefined),
    register: vi.fn(),
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
  test('calls login with usuario and password', async () => {
    const { container, auth } = renderWithAuth();
    const inputs = container.querySelectorAll('ion-input');
    const usuarioInput = inputs[0];
    const passwordInput = inputs[1];
    const form = container.querySelector('form');

    fireEvent(usuarioInput!, new CustomEvent('ionChange', { detail: { value: 'testuser' } }));
    fireEvent(passwordInput!, new CustomEvent('ionChange', { detail: { value: 'pass' } }));
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(auth.login).toHaveBeenCalledWith('testuser', 'pass');
    });
  });
});
