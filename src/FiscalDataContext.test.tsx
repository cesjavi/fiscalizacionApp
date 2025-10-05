import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import {
  FiscalDataProvider,
  useFiscalData,
  type FiscalData,
} from './FiscalDataContext';

const Consumer: React.FC = () => {
  const { fiscalData, hasFiscalData } = useFiscalData();
  return (
    <div>
      <div data-testid="has-data">{String(hasFiscalData)}</div>
      <div data-testid="apellidos">{fiscalData?.apellidos_miembro ?? ''}</div>
      <div data-testid="nombres">{fiscalData?.nombres_miembro ?? ''}</div>
      <div data-testid="tipo">{fiscalData?.nombre_tipo_miembro ?? ''}</div>
      <div data-testid="zona">{fiscalData?.nombre_zona ?? ''}</div>
    </div>
  );
};

describe('FiscalDataProvider hydration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hydrates data already in the new format', () => {
    const payload: FiscalData = {
      apellidos_miembro: 'Doe',
      nombres_miembro: 'Jane',
      nombre_tipo_miembro: 'General',
      nombre_zona: 'Zona 1',
    };
    localStorage.setItem('fiscalData', JSON.stringify(payload));

    render(
      <FiscalDataProvider>
        <Consumer />
      </FiscalDataProvider>,
    );

    expect(screen.getByTestId('has-data').textContent).toBe('true');
    expect(screen.getByTestId('apellidos').textContent).toBe('Doe');
    expect(screen.getByTestId('nombres').textContent).toBe('Jane');
    expect(screen.getByTestId('tipo').textContent).toBe('General');
    expect(screen.getByTestId('zona').textContent).toBe('Zona 1');
  });

  it('migrates legacy cached data to the new format', async () => {
    const legacyPayload = {
      persona: 'Doe, Jane',
      tipo_fiscal: 'Suplente',
      zona: 'Zona 9',
    };
    localStorage.setItem('fiscalData', JSON.stringify(legacyPayload));

    render(
      <FiscalDataProvider>
        <Consumer />
      </FiscalDataProvider>,
    );

    expect(screen.getByTestId('has-data').textContent).toBe('true');
    expect(screen.getByTestId('apellidos').textContent).toBe('Doe');
    expect(screen.getByTestId('nombres').textContent).toBe('Jane');
    expect(screen.getByTestId('tipo').textContent).toBe('Suplente');
    expect(screen.getByTestId('zona').textContent).toBe('Zona 9');

    await waitFor(() => {
      const stored = localStorage.getItem('fiscalData');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.apellidos_miembro).toBe('Doe');
      expect(parsed.nombres_miembro).toBe('Jane');
      expect(parsed.nombre_tipo_miembro).toBe('Suplente');
      expect(parsed.nombre_zona).toBe('Zona 9');
    });
  });
});
