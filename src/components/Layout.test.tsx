import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import Layout, { formatTitle } from './Layout';
import {
  FiscalDataProvider,
  type FiscalData,
} from '../FiscalDataContext';

const logoutMock = vi.fn();
const pushMock = vi.fn();
const replaceMock = vi.fn();
let isAuthenticatedMock = true;
let mockPathname = '/';

vi.mock('../AuthContext', () => ({
  useAuth: () => ({
    logout: logoutMock,
    isAuthenticated: isAuthenticatedMock,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return {
    ...actual,
    useHistory: () => ({ push: pushMock, replace: replaceMock }),
    useLocation: () => ({ pathname: mockPathname }),
  };
});

describe('formatTitle', () => {
  it('renders the base title when no fiscal data is provided', () => {
    expect(formatTitle()).toBe('Fiscalizacion Comuna 7');
  });

  it('uses the new fields when available', () => {
    expect(
      formatTitle({
        apellidos_miembro: 'Doe',
        nombres_miembro: 'Jane',
      }),
    ).toBe('Doe, Jane');
  });

  it('falls back to legacy persona strings', () => {
    expect(
      formatTitle({
        persona: 'Doe, Jane',
      } as FiscalData),
    ).toBe('Doe, Jane');
  });
});

describe('Layout title rendering', () => {
  beforeEach(() => {
    localStorage.clear();
    logoutMock.mockReset();
    pushMock.mockReset();
    replaceMock.mockReset();
    isAuthenticatedMock = true;
    mockPathname = '/';
  });

  it('renders title for data already normalized', () => {
    localStorage.setItem(
      'fiscalData',
      JSON.stringify({
        apellidos_miembro: 'Doe',
        nombres_miembro: 'Jane',
      }),
    );

    render(
      <FiscalDataProvider>
        <Layout>Children</Layout>
      </FiscalDataProvider>,
    );

    expect(screen.getByText('Doe, Jane')).toBeInTheDocument();
  });

  it('renders title when only legacy cached data is present', () => {
    localStorage.setItem(
      'fiscalData',
      JSON.stringify({
        persona: 'Doe, Jane',
      }),
    );

    render(
      <FiscalDataProvider>
        <Layout>Children</Layout>
      </FiscalDataProvider>,
    );

    expect(screen.getByText('Doe, Jane')).toBeInTheDocument();
  });

  it('logs out automatically when visiting the login route while authenticated', async () => {
    mockPathname = '/login';

    render(
      <FiscalDataProvider>
        <Layout>Children</Layout>
      </FiscalDataProvider>,
    );

    await waitFor(() => expect(logoutMock).toHaveBeenCalledTimes(1));
    expect(replaceMock).toHaveBeenCalledWith('/login');
  });
});
