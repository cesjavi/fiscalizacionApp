import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import {
  FiscalDataProvider,
  useFiscalData,
  type FiscalData,
  getFiscalAssignmentDetails,
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

describe('getFiscalAssignmentDetails', () => {
  it('returns values from direct fields', () => {
    const payload: FiscalData = {
      mesa: '1234',
      nombre_escuela: 'Escuela Primaria 1',
      direccion_escuela: 'Calle Principal 456',
      fiscal_general: 'Juan Pérez',
    };

    const result = getFiscalAssignmentDetails(payload);
    expect(result.mesa).toBe('1234');
    expect(result.establecimiento).toBe('Escuela Primaria 1');
    expect(result.direccion).toBe('Calle Principal 456');
    expect(result.fiscalGeneral).toBe('Juan Pérez');
  });

  it('extracts nested values when necessary', () => {
    const payload: FiscalData = {
      establecimiento: { nombre: 'Colegio Nacional', direccion: 'Calle Falsa 123' },
      mesa_asignada: { numero: '4321' },
      fiscalGeneral: { nombre: 'María López' },
    };

    const result = getFiscalAssignmentDetails(payload);
    expect(result.mesa).toBe('4321');
    expect(result.establecimiento).toBe('Colegio Nacional');
    expect(result.direccion).toBe('Calle Falsa 123');
    expect(result.fiscalGeneral).toBe('María López');
  });

  it('prefers escuela specific keys when available', () => {
    const payload: FiscalData = {
      escuela: { descripcion: 'Escuela Secundaria 12' },
      direccionEscuela: 'Av. Siempre Viva 742',
      lugar: 'Polideportivo Municipal',
    };

    const result = getFiscalAssignmentDetails(payload);
    expect(result.establecimiento).toBe('Escuela Secundaria 12');
    expect(result.direccion).toBe('Av. Siempre Viva 742');
    expect(result.lugar).toBe('Polideportivo Municipal');
  });

  it('reads establecimiento_fiscalizacion nested metadata', () => {
    const payload: FiscalData = {
      establecimiento_fiscalizacion: {
        nombre: 'Inst. Ntra. Sra. De La Misericordia',
        direccion: 'Camacua 493',
      },
      mesas: [{ numero: '123' }],
      fg_asignado: [{ nombre: 'Fiscal General' }],
    };

    const result = getFiscalAssignmentDetails(payload);
    expect(result.establecimiento).toBe('Inst. Ntra. Sra. De La Misericordia');
    expect(result.direccion).toBe('Camacua 493');
    expect(result.fiscalGeneral).toBe('Fiscal General');
  });

  it('derives fiscal general name from nested persona details', () => {
    const payload: FiscalData = {
      fg_asignado: [
        {
          persona: {
            apellidos: 'Pérez',
            nombres: 'Juana',
          },
        },
      ],
    };

    const result = getFiscalAssignmentDetails(payload);
    expect(result.fiscalGeneral).toBe('Juana Pérez');
  });
});
