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
  test('calls login with email and password', async () => {
    const { container, auth } = renderWithAuth();
    const emailInput = container.querySelector('ion-input[type="email"]');
    const passwordInput = container.querySelector('ion-input[type="password"]');
    const form = container.querySelector('form');

    fireEvent(emailInput!, new CustomEvent('ionChange', { detail: { value: 'test@example.com' } }));
    fireEvent(passwordInput!, new CustomEvent('ionChange', { detail: { value: 'pass' } }));
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(auth.login).toHaveBeenCalledWith('test@example.com', 'pass');
    });
  });

  test('calls loginWithDni with dni and password', async () => {
    const { container, auth } = renderWithAuth();
    const segment = container.querySelector('ion-segment');
    fireEvent(segment!, new CustomEvent('ionChange', { detail: { value: 'dni' } }));

    const inputs = container.querySelectorAll('ion-input');
    const dniInput = inputs[0];
    const passwordInput = inputs[1];
    const form = container.querySelector('form');

    fireEvent(dniInput!, new CustomEvent('ionChange', { detail: { value: '12345678' } }));
    fireEvent(passwordInput!, new CustomEvent('ionChange', { detail: { value: 'pass' } }));
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(auth.loginWithDni).toHaveBeenCalledWith('12345678', 'pass');
    });
  });
});
