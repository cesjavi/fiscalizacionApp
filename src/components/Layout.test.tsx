import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import Layout, { formatTitle } from './Layout';
import {
  FiscalDataProvider,
  type FiscalData,
} from '../FiscalDataContext';

vi.mock('../AuthContext', () => ({
  useAuth: () => ({
    logout: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return {
    ...actual,
    useHistory: () => ({ push: vi.fn() }),
  };
});

describe('formatTitle', () => {
  it('renders the base title when no fiscal data is provided', () => {
    expect(formatTitle()).toBe('Fiscalizacion App');
  });

  it('uses the new fields when available', () => {
    expect(
      formatTitle({
        apellidos_miembro: 'Doe',
        nombres_miembro: 'Jane',
      }),
    ).toBe('Fiscalizacion App – Doe Jane');
  });

  it('falls back to legacy persona strings', () => {
    expect(
      formatTitle({
        persona: 'Doe, Jane',
      } as FiscalData),
    ).toBe('Fiscalizacion App – Doe Jane');
  });
});

describe('Layout title rendering', () => {
  beforeEach(() => {
    localStorage.clear();
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

    expect(
      screen.getByText('Fiscalizacion App – Doe Jane'),
    ).toBeInTheDocument();
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

    expect(
      screen.getByText('Fiscalizacion App – Doe Jane'),
    ).toBeInTheDocument();
  });
});
