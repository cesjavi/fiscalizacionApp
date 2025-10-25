import {
  IonContent,
  IonItem,
  IonLabel,
  IonModal,
  IonSelect,
  IonSelectOption,
} from '@ionic/react';
import Layout from '../components/Layout';
import { Button, Input } from '../components';
import {
  getFiscalAssignmentDetails,
  getMemberNameParts,
  useFiscalData,
} from '../FiscalDataContext';
import type { FiscalData } from '../FiscalDataContext';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import type { ChangeEvent } from 'react';
import { useAuth } from '../AuthContext';
import type { CSSProperties } from 'react';

const labelStyle: CSSProperties = { display: 'block', marginBottom: 10 };
const inputStyle: CSSProperties = { marginTop: 8, width: '100%' };
const itemStyle: CSSProperties = {
  ['--inner-padding-top' as unknown as string]: '10px',
  ['--inner-padding-bottom' as unknown as string]: '10px',
};

// ==== Tipos auxiliares para leer el shape real que llega del API ====
type FDMesa = { numero?: string | number };
type FDAsignado = { nombre?: string; mesas?: Array<FDMesa> };
type FDEstablecimiento = { direccion?: string; mesas?: Array<FDMesa> };
type FDShape = {
  f_g_asignado?: FDAsignado;
  establecimiento_fiscalizacion?: FDEstablecimiento;
  nombre_establecimiento?: string;
  establecimiento?: string;
  lugar?: string;
  direccion_establecimiento?: string;
  direccion?: string;
  mesa?: string | number;
};

// helper local: string recortado o undefined
const str = (v: unknown): string | undefined =>
  typeof v === 'string' ? (v.trim() ? v.trim() : undefined) : undefined;

// === Tipos para coords del API (sin any) ===
type GeoPoint = { lat?: number | string; lng?: number | string };
type FiscalDataGeo = FiscalData & {
  ubicacion?: GeoPoint;
  establecimiento_fiscalizacion?: { direccion?: string; ubicacion?: GeoPoint };
};

// number seguro desde string|number|otro
const toNumber = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

type MemberNameParts = ReturnType<typeof getMemberNameParts>;

type EstablecimientoFormState = {
  seccion: string;
  circuito: string;
  mesa: string;
  nombre: string;
};

type FiscalMesaCard = {
  id: string;
  nombre?: string;
  telefono?: string;
  mesa?: string;
  isMesaTestigo?: boolean;
};

type MesaResumen = {
  id: string;
  numero?: string;
  fiscales?: string[];
  esMesaTestigo?: boolean;
};

type EstablecimientoCard = {
  id: string;
  nombre?: string;
  direccion?: string;
  mapsQuery?: string;
  fiscalGeneral?: string;
  telefono?: string;
  mesas?: MesaResumen[];
};

type MesasModalGroup = {
  establecimiento: EstablecimientoCard;
  mesas: MesaResumen[];
};

type MesasModalState = {
  title: string;
  groups: MesasModalGroup[];
  emptyMessage: string;
  noGroupsMessage?: string;
};

type RoleContact = {
  nombre?: string;
  telefono?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | undefined => {
  if (typeof value === 'string' || typeof value === 'number') {
    const text = `${value}`.trim();
    return text || undefined;
  }
  return undefined;
};

const formatMemberNameFromParts = (parts: MemberNameParts): string | undefined => {
  const { displayName, apellidos, nombres } = parts;
  if (displayName && displayName.trim().length > 0) return displayName.trim();
  const trimmedApellidos = apellidos?.trim();
  const trimmedNombres = nombres?.trim();
  if (trimmedApellidos && trimmedNombres) {
    return `${trimmedApellidos}, ${trimmedNombres}`;
  }
  return trimmedApellidos || trimmedNombres || undefined;
};

const PHONE_KEYS = [
  'telefono',
  'telefono_contacto',
  'telefonoContacto',
  'telefono_fg',
  'telefonoFG',
  'telefono_fiscal_general',
  'tel',
  'telefono1',
  'telefono_1',
  'telefono2',
  'telefono_2',
  'celular',
  'cel',
  'movil',
  'whatsapp',
  'phone',
] as const;

const stringFromKeys = (
  record: Record<string, unknown>,
  keys: readonly string[],
  visited: Set<unknown> = new Set(),
): string | undefined => {
  for (const key of keys) {
    if (!(key in record)) continue;
    const value = record[key];
    const direct = asString(value);
    if (direct) return direct;
    if (value && typeof value === 'object' && !visited.has(value)) {
      visited.add(value);
      if (isRecord(value)) {
        const nested = stringFromKeys(value, keys, visited);
        if (nested) return nested;
      }
    }
  }
  return undefined;
};

const extractPersonName = (record: Record<string, unknown>): string | undefined => {
  const fromParts = formatMemberNameFromParts(
    getMemberNameParts(record as Record<string, unknown> & { persona?: unknown }),
  );
  if (fromParts) return fromParts;

  const direct = stringFromKeys(
    record,
    ['nombre_completo', 'nombreCompleto', 'nombre_y_apellido', 'nombreApellido', 'displayName'],
  );
  if (direct) return direct;

  const apellido = stringFromKeys(record, ['apellidos', 'apellido']);
  const nombres = stringFromKeys(record, ['nombres', 'nombre']);
  if (apellido || nombres) {
    return [apellido, nombres].filter(Boolean).join(apellido && nombres ? ', ' : '');
  }

  const personaValue = record['persona'];
  if (isRecord(personaValue)) {
    return extractPersonName(personaValue);
  }

  return undefined;
};

const isLikelyPhone = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (!/^[\d+\s().-]+$/.test(trimmed)) return false;
  const digitsOnly = trimmed.replace(/\D/g, '');
  return digitsOnly.length >= 6;
};

const extractPhone = (
  record: Record<string, unknown>,
  visited: Set<unknown> = new Set(),
): string | undefined => {
  if (visited.has(record)) return undefined;
  visited.add(record);

  for (const key of PHONE_KEYS) {
    if (key in record) {
      const value = asString(record[key]);
      if (value && isLikelyPhone(value)) return value;
    }
  }

  const personaValue = record['persona'];
  if (isRecord(personaValue)) {
    const nested = extractPhone(personaValue, visited);
    if (nested) return nested;
  }

  for (const value of Object.values(record)) {
    if (!value || typeof value !== 'object') continue;
    if (visited.has(value)) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === 'object' && !visited.has(item)) {
          const nested = extractPhone(item as Record<string, unknown>, visited);
          if (nested) return nested;
        }
      }
      continue;
    }
    if (isRecord(value)) {
      const nested = extractPhone(value, visited);
      if (nested) return nested;
    }
  }

  return undefined;
};

type RoleContactConfig = {
  primaryKeys: readonly string[];
  keySubstrings: readonly string[];
  phoneKeys: readonly string[];
  additionalNameKeys?: readonly string[];
};

const DEFAULT_ROLE_NAME_KEYS = [
  'nombre',
  'name',
  'descripcion',
  'description',
  'displayName',
  'nombreCompleto',
  'nombre_completo',
] as const;

const FISCAL_GENERAL_CONTACT_CONFIG: RoleContactConfig = {
  primaryKeys: [
    'fiscal_general',
    'fiscalGeneral',
    'fiscal_general_asignado',
    'fg_asignado',
    'f_g_asignado',
    'fiscal_general_contacto',
  ],
  keySubstrings: ['fiscal_general', 'fiscalgeneral', 'fg_asignado', 'fg'],
  phoneKeys: [
    'telefono_fg',
    'telefonoFG',
    'telefono_fiscal_general',
    'telefono_fiscalgeneral',
    'telefono_fg_asignado',
    'whatsapp_fg',
    'cel_fg',
  ],
  additionalNameKeys: ['nombre_fiscal_general', 'fiscal_general_nombre'],
};

const FISCAL_ZONAL_CONTACT_CONFIG: RoleContactConfig = {
  primaryKeys: [
    'fiscal_zonal',
    'fiscalZonal',
    'f_z_asignado',
    'fz_asignado',
    'coordinador_zonal',
    'coordinadorZona',
    'zonaEleccion',
  ],
  keySubstrings: [
    'fiscal_zonal',
    'fiscalzonal',
    'coordinador_zona',
    'coordinadorzona',
    'coordinador_zonal',
    'fz_asignado',
    'f_z',
  ],
  phoneKeys: [
    'telefono_fiscal_zonal',
    'telefono_zonal',
    'telefono_fz',
    'telefono_coordinador_zona',
    'telefono_coordinadorZona',
    'whatsapp_zona',
    'cel_zona',
  ],
  additionalNameKeys: ['nombre_fiscal_zonal', 'fiscal_zonal_nombre', 'coordinador_nombre'],
};

const collectRoleContact = (
  value: unknown,
  config: RoleContactConfig,
  result: RoleContact,
  visited: Set<unknown>,
  isTarget = false,
) => {
  if (value === null || value === undefined) return;
  if (typeof value === 'string' || typeof value === 'number') {
    if (!isTarget) return;
    const text = `${value}`.trim();
    if (!text) return;
    if (!result.nombre) {
      result.nombre = text;
      return;
    }
    if (!result.telefono && isLikelyPhone(text)) {
      result.telefono = text;
    }
    return;
  }

  if (typeof value !== 'object') return;
  if (visited.has(value)) return;
  visited.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      if (result.nombre && result.telefono) break;
      collectRoleContact(item, config, result, visited, isTarget);
    }
    return;
  }

  const record = value as Record<string, unknown>;

  if (isTarget) {
    if (!result.nombre) {
      const fromNameKeys = config.additionalNameKeys
        ? stringFromKeys(record, config.additionalNameKeys)
        : undefined;
      const extracted = extractPersonName(record);
      const fallback =
        fromNameKeys || extracted || stringFromKeys(record, DEFAULT_ROLE_NAME_KEYS);
      if (fallback) {
        result.nombre = fallback;
      }
    }

    if (!result.telefono) {
      const phone = stringFromKeys(record, [...config.phoneKeys, ...PHONE_KEYS]);
      if (phone && isLikelyPhone(phone)) {
        result.telefono = phone;
      } else {
        const nestedPhone = extractPhone(record);
        if (nestedPhone) {
          result.telefono = nestedPhone;
        }
      }
    }
  }

  for (const [key, nested] of Object.entries(record)) {
    if (result.nombre && result.telefono) break;
    const lowerKey = key.toLowerCase();

    const matchesPrimary = config.primaryKeys.some(
      (candidate) => candidate.toLowerCase() === lowerKey,
    );
    if (matchesPrimary) {
      collectRoleContact(nested, config, result, visited, true);
      continue;
    }

    const matchesSubstring = config.keySubstrings.some((substring) =>
      lowerKey.includes(substring.toLowerCase()),
    );

    if (matchesSubstring) {
      const isPhoneKey =
        lowerKey.includes('tel') ||
        lowerKey.includes('whats') ||
        config.phoneKeys.some((phoneKey) => lowerKey.includes(phoneKey.toLowerCase()));

      if (isPhoneKey) {
        if (!result.telefono) {
          const phoneValue = asString(nested);
          if (phoneValue) {
            result.telefono = phoneValue;
            continue;
          }
        }
        collectRoleContact(nested, config, result, visited, true);
        continue;
      }

      collectRoleContact(nested, config, result, visited, true);
      continue;
    }

    collectRoleContact(nested, config, result, visited, isTarget);
  }
};

const extractRoleContact = (
  data: FiscalData | null | undefined,
  config: RoleContactConfig,
): RoleContact | undefined => {
  if (!data) return undefined;
  const result: RoleContact = {};
  collectRoleContact(data, config, result, new Set());
  return result.nombre || result.telefono ? result : undefined;
};

const MESA_KEYS = [
  'mesa',
  'mesa_nro',
  'mesaNumero',
  'mesa_numero',
  'numero_mesa',
  'numeroMesa',
  'numero',
  'mesaId',
  'mesa_id',
  'mesaAsignada',
  'mesa_asignada',
  'mesaAsignado',
  'mesa_asignado',
] as const;

const extractMesaNumero = (
  record: Record<string, unknown>,
  visited: Set<unknown> = new Set(),
): string | undefined => {
  for (const key of MESA_KEYS) {
    if (!(key in record)) continue;
    const value = record[key];
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' || typeof value === 'number') {
      const formatted = `${value}`.trim();
      if (formatted) return formatted;
    }
    if (value && typeof value === 'object' && !visited.has(value)) {
      visited.add(value);
      if (isRecord(value)) {
        const nested = extractMesaNumero(value, visited);
        if (nested) return nested;
      }
    }
  }
  const extraMesaSources = [
    record['mesa_asignada'],
    record['mesaAsignada'],
    record['mesa_asignado'],
    record['mesaAsignado'],
  ];

  for (const source of extraMesaSources) {
    if (!source || typeof source !== 'object' || visited.has(source)) continue;
    visited.add(source);
    if (!isRecord(source)) continue;
    const nested = extractMesaNumero(source, visited);
    if (nested) return nested;
  }

  return undefined;
};

const TESTIGO_KEYS = ['mesa_testigo', 'es_mesa_testigo', 'mesaTestigo', 'testigo', 'esTestigo'] as const;

const parseBooleanValue = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) && value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    if (normalized === '1' || normalized === 'true' || normalized === 't') return true;
    if (normalized === 'si' || normalized === 'sí' || normalized === 'yes') return true;
    if (normalized === '0' || normalized === 'false' || normalized === 'f' || normalized === 'no') return false;
    if (normalized.includes('testigo')) return true;
  }
  return false;
};

const extractIsMesaTestigo = (record: Record<string, unknown>): boolean => {
  for (const key of TESTIGO_KEYS) {
    if (key in record && parseBooleanValue(record[key])) {
      return true;
    }
  }

  const mesaValue = record['mesa'];
  if (isRecord(mesaValue)) {
    return extractIsMesaTestigo(mesaValue);
  }

  const mesaAsignadaValue =
    record['mesa_asignada'] ?? record['mesaAsignada'] ?? record['mesa_asignado'] ?? record['mesaAsignado'];
  if (isRecord(mesaAsignadaValue)) {
    return extractIsMesaTestigo(mesaAsignadaValue);
  }

  return false;
};

const collectFiscalesDeMesa = (
  value: unknown,
  results: Map<string, FiscalMesaCard>,
  visited: Set<unknown>,
) => {
  if (value === null || value === undefined) return;
  if (typeof value !== 'object') return;
  if (visited.has(value)) return;
  visited.add(value);

  if (Array.isArray(value)) {
    value.forEach((item) => collectFiscalesDeMesa(item, results, visited));
    return;
  }

  if (!isRecord(value)) return;

  const mesa = extractMesaNumero(value);
  const telefono = extractPhone(value);
  const nombre = extractPersonName(value);
  const isMesaTestigo = extractIsMesaTestigo(value);

  if (mesa || telefono || nombre) {
    const key = `${(nombre ?? '').toLowerCase()}|${telefono ?? ''}|${mesa ?? ''}`;
    if (!results.has(key)) {
      results.set(key, {
        id: key || `fiscal-${results.size}`,
        mesa,
        telefono,
        nombre,
        isMesaTestigo,
      });
    }
  }

  Object.values(value).forEach((nested) => {
    if (nested && typeof nested === 'object') {
      collectFiscalesDeMesa(nested, results, visited);
    }
  });
};

const FISCALES_KEYS = [
  'fiscales_de_mesa',
  'fiscalesMesa',
  'fiscales_mesa',
  'fiscales',
  'fiscalesAsignados',
  'fiscales_asignados',
  'mesasAsignadas',
  'mesas_asignadas',
  'mesas',
  'lista_fiscales',
  'listado_fiscales',
] as const;

const extractFiscalesDeMesa = (data?: FiscalData | null): FiscalMesaCard[] => {
  if (!data) return [];
  const record = data as Record<string, unknown>;
  const visited = new Set<unknown>();
  const results = new Map<string, FiscalMesaCard>();

  FISCALES_KEYS.forEach((key) => {
    if (key in record) {
      collectFiscalesDeMesa(record[key], results, visited);
    }
  });

  return Array.from(results.values());
};

const extractCoords = (
  value: unknown,
  visited: Set<unknown> = new Set(),
): { lat: number; lng: number } | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'object') {
    if (Array.isArray(value)) {
      for (const item of value) {
        const nested = extractCoords(item, visited);
        if (nested) return nested;
      }
    }
    return undefined;
  }

  if (visited.has(value)) return undefined;
  visited.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = extractCoords(item, visited);
      if (nested) return nested;
    }
    return undefined;
  }

  if (!isRecord(value)) return undefined;

  const lat = toNumber(
    value['lat'] ?? value['latitude'] ?? value['latitud'] ?? value['Lat'] ?? value['LAT'],
  );
  const lng = toNumber(
    value['lng'] ??
      value['long'] ??
      value['lon'] ??
      value['longitude'] ??
      value['longitud'] ??
      value['Lng'] ??
      value['LNG'],
  );
  if (lat !== undefined && lng !== undefined) {
    return { lat, lng };
  }

  const coordinates = value['coordinates'];
  if (Array.isArray(coordinates) && coordinates.length >= 2) {
    const maybeLng = toNumber(coordinates[0]);
    const maybeLat = toNumber(coordinates[1]);
    if (maybeLat !== undefined && maybeLng !== undefined) {
      return { lat: maybeLat, lng: maybeLng };
    }
  }

  const nestedCandidates = [
    value['ubicacion'],
    value['location'],
    value['ubicacion_geo'],
    value['geo'],
  ];

  for (const candidate of nestedCandidates) {
    if (candidate && typeof candidate === 'object') {
      const nested = extractCoords(candidate, visited);
      if (nested) return nested;
    }
  }

  for (const nested of Object.values(value)) {
    if (nested && typeof nested === 'object') {
      const result = extractCoords(nested, visited);
      if (result) return result;
    }
  }

  return undefined;
};

const ESTABLECIMIENTO_NAME_KEYS = [
  'nombre_establecimiento',
  'nombre_establecimiento_fiscalizacion',
  'nombre_establecimiento_educativo',
  'nombre_escuela',
  'nombre_lugar',
  'nombre',
  'descripcion',
  'description',
  'colegio',
  'escuela',
  'establecimiento',
  'lugar',
] as const;

const DIRECCION_KEYS = [
  'direccion_establecimiento',
  'direccion_establecimiento_fiscalizacion',
  'direccion_escuela',
  'direccion_lugar',
  'direccion',
  'domicilio',
  'ubicacion',
  'address',
  'calle',
] as const;

const collectNamesFromValue = (
  value: unknown,
  results: Set<string>,
  visited: Set<unknown>,
) => {
  if (value === null || value === undefined) return;
  if (typeof value === 'string' || typeof value === 'number') {
    const text = `${value}`.trim();
    if (text) results.add(text);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectNamesFromValue(item, results, visited));
    return;
  }

  if (typeof value !== 'object') return;
  if (visited.has(value)) return;
  visited.add(value);

  const record = value as Record<string, unknown>;
  const extracted = extractPersonName(record);
  if (extracted) {
    results.add(extracted);
  }

  if ('persona' in record) {
    collectNamesFromValue(record['persona'], results, visited);
  }
  if ('miembro' in record) {
    collectNamesFromValue(record['miembro'], results, visited);
  }
  if ('fiscal' in record) {
    collectNamesFromValue(record['fiscal'], results, visited);
  }

  Object.entries(record).forEach(([key, child]) => {
    if (!child) return;
    const lower = key.toLowerCase();
    if (
      lower.includes('nombre') ||
      lower.includes('persona') ||
      lower.includes('miembro') ||
      lower.includes('fiscal') ||
      lower.includes('contacto') ||
      lower.includes('fg')
    ) {
      collectNamesFromValue(child, results, visited);
    }
  });
};

type MesaSummaryAccumulator = {
  numero?: string;
  esMesaTestigo: boolean;
  fiscales: Set<string>;
};

const collectMesaSummaries = (
  value: unknown,
  results: Map<string, MesaSummaryAccumulator>,
  visited: Set<unknown>,
  getFallbackKey: () => string,
) => {
  if (value === null || value === undefined) return;

  if (typeof value === 'string' || typeof value === 'number') {
    const numero = `${value}`.trim();
    if (!numero) return;
    const key = numero.toLowerCase();
    if (!results.has(key)) {
      results.set(key, {
        numero,
        esMesaTestigo: false,
        fiscales: new Set<string>(),
      });
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectMesaSummaries(item, results, visited, getFallbackKey));
    return;
  }

  if (typeof value !== 'object') return;
  if (visited.has(value)) return;
  visited.add(value);

  const record = value as Record<string, unknown>;
  const numero = resolveMesaValue(record);
  const esMesaTestigo = extractIsMesaTestigo(record);

  const names = new Set<string>();
  const namesVisited = new Set<unknown>();
  const nameSources = [
    record['fg_asignado'],
    record['fgAsignado'],
    record['fiscales'],
    record['fiscales_mesa'],
    record['fiscalesMesa'],
    record['fiscales_asignados'],
    record['fiscalesAsignados'],
    record['fiscales_de_mesa'],
    record['fiscalesDeMesa'],
    record['miembros'],
    record['asignados'],
  ];
  nameSources.forEach((source) => collectNamesFromValue(source, names, namesVisited));

  if (!names.size) {
    const directName = extractPersonName(record);
    if (
      directName &&
      (numero || record['mesa'] || record['mesa_asignada'] || record['mesaAsignada'])
    ) {
      names.add(directName);
    }
  }

  if ('persona' in record) {
    collectNamesFromValue(record['persona'], names, namesVisited);
  }
  if ('miembro' in record) {
    collectNamesFromValue(record['miembro'], names, namesVisited);
  }
  if ('fiscal' in record) {
    collectNamesFromValue(record['fiscal'], names, namesVisited);
  }

  const mapKey = numero ? numero.toLowerCase() : getFallbackKey();
  const existing = results.get(mapKey) ?? {
    numero: numero ?? undefined,
    esMesaTestigo: false,
    fiscales: new Set<string>(),
  };
  if (numero && !existing.numero) existing.numero = numero;
  if (esMesaTestigo) existing.esMesaTestigo = true;
  names.forEach((name) => existing.fiscales.add(name));
  results.set(mapKey, existing);

  Object.entries(record).forEach(([key, child]) => {
    if (!child) return;
    const lower = key.toLowerCase();
    if (
      lower.includes('mesa') ||
      lower.includes('fiscal') ||
      lower.includes('miembro') ||
      lower.includes('persona') ||
      lower.includes('fg')
    ) {
      collectMesaSummaries(child, results, visited, getFallbackKey);
    }
  });
};

const collectEstablecimientoMesas = (record: Record<string, unknown>): MesaResumen[] => {
  const results = new Map<string, MesaSummaryAccumulator>();
  const visited = new Set<unknown>();
  const containerVisited = new Set<unknown>();
  let fallbackIndex = 0;

  const getFallbackKey = () => `__mesa_${fallbackIndex++}`;

  const traverseContainers = (value: unknown) => {
    if (value === null || value === undefined) return;
    if (typeof value === 'string' || typeof value === 'number') return;
    if (Array.isArray(value)) {
      value.forEach((item) => traverseContainers(item));
      return;
    }
    if (typeof value !== 'object') return;
    if (containerVisited.has(value)) return;
    containerVisited.add(value);

    const recordValue = value as Record<string, unknown>;
    Object.entries(recordValue).forEach(([key, child]) => {
      if (!child) return;
      const lower = key.toLowerCase();
      if (lower.includes('mesa')) {
        collectMesaSummaries(child, results, visited, getFallbackKey);
      } else if (typeof child === 'object') {
        traverseContainers(child);
      }
    });
  };

  collectMesaSummaries(record['mesas'], results, visited, getFallbackKey);
  traverseContainers(record);

  const mesas = Array.from(results.values()).map((entry, index) => ({
    id: entry.numero ? `mesa-${entry.numero}` : `mesa-${index + 1}`,
    numero: entry.numero,
    esMesaTestigo: entry.esMesaTestigo ? true : undefined,
    fiscales: entry.fiscales.size > 0 ? Array.from(entry.fiscales) : undefined,
  }));

  return mesas.sort((a, b) => {
    const aNumero = a.numero ?? '';
    const bNumero = b.numero ?? '';
    if (!aNumero && bNumero) return 1;
    if (aNumero && !bNumero) return -1;
    return aNumero.localeCompare(bNumero, undefined, { numeric: true, sensitivity: 'base' });
  });
};

const buildEstablecimientoCard = (
  record: Record<string, unknown>,
): Omit<EstablecimientoCard, 'id'> | undefined => {
  const nombre = stringFromKeys(record, ESTABLECIMIENTO_NAME_KEYS);
  const direccion = stringFromKeys(record, DIRECCION_KEYS);
  const coords = extractCoords(record);
  const mapsQuery = coords
    ? `${coords.lat},${coords.lng}`
    : [nombre, direccion].filter(Boolean).join(' ');

  let fiscalGeneral = stringFromKeys(record, ['nombre_fiscal_general', 'fiscal_general_nombre']);
  let telefono = stringFromKeys(record, ['telefono_fg', 'telefonoFG', 'telefono_fiscal_general']);

  const rawFG = record['fiscal_general'] ?? record['fiscalGeneral'] ?? record['fg'];
  if (isRecord(rawFG)) {
    fiscalGeneral = fiscalGeneral ?? extractPersonName(rawFG);
    telefono = telefono ?? extractPhone(rawFG);
  } else if (Array.isArray(rawFG)) {
    for (const item of rawFG) {
      if (isRecord(item)) {
        fiscalGeneral = fiscalGeneral ?? extractPersonName(item);
        telefono = telefono ?? extractPhone(item);
      } else if (typeof item === 'string' && !fiscalGeneral) {
        const trimmed = item.trim();
        if (trimmed) fiscalGeneral = trimmed;
      }
      if (fiscalGeneral && telefono) break;
    }
  } else if (typeof rawFG === 'string') {
    const trimmed = rawFG.trim();
    if (trimmed) {
      fiscalGeneral = fiscalGeneral ?? trimmed;
    }
  }

  telefono = telefono ?? extractPhone(record);

  if (!nombre && !direccion) {
    return undefined;
  }

  const mesas = collectEstablecimientoMesas(record);

  return {
    nombre,
    direccion,
    mapsQuery: mapsQuery || undefined,
    fiscalGeneral,
    telefono,
    mesas: mesas.length > 0 ? mesas : undefined,
  };
};

const ESTABLECIMIENTOS_KEYS = [
  'establecimientos',
  'establecimientos_asignados',
  'establecimientosAsignados',
  'establecimiento_fiscalizacion',
  'establecimientos_fiscalizacion',
  'escuelas',
  'escuelas_asignadas',
  'escuelasAsignadas',
  'colegios',
  'lugares',
  'lugaresFiscalizacion',
  'zonaEleccion',
  'zona_eleccion',
] as const;

const collectEstablecimientos = (
  value: unknown,
  results: Map<string, EstablecimientoCard>,
  visited: Set<unknown>,
) => {
  if (value === null || value === undefined) return;
  if (typeof value !== 'object') return;
  if (visited.has(value)) return;
  visited.add(value);

  if (Array.isArray(value)) {
    value.forEach((item) => collectEstablecimientos(item, results, visited));
    return;
  }

  if (!isRecord(value)) return;

  const card = buildEstablecimientoCard(value);
  if (card) {
    const key = `${(card.nombre ?? '').toLowerCase()}|${(card.direccion ?? '').toLowerCase()}`;
    if (!results.has(key)) {
      results.set(key, {
        id: key || `est-${results.size}`,
        ...card,
      });
    } else {
      const existing = results.get(key)!;
      if (!existing.fiscalGeneral && card.fiscalGeneral) {
        existing.fiscalGeneral = card.fiscalGeneral;
      }
      if (!existing.telefono && card.telefono) {
        existing.telefono = card.telefono;
      }
      if (!existing.mapsQuery && card.mapsQuery) {
        existing.mapsQuery = card.mapsQuery;
      }
      if (card.mesas?.length) {
        const merged = new Map<string, MesaResumen>();
        existing.mesas?.forEach((mesa) => {
          const mesaKey = (mesa.numero ?? mesa.id).toLowerCase();
          merged.set(mesaKey, mesa);
        });
        card.mesas.forEach((mesa) => {
          const mesaKey = (mesa.numero ?? mesa.id).toLowerCase();
          if (!merged.has(mesaKey)) {
            merged.set(mesaKey, mesa);
            return;
          }
          const current = merged.get(mesaKey)!;
          const fiscales = new Set<string>(current.fiscales ?? []);
          (mesa.fiscales ?? []).forEach((name) => {
            if (name) fiscales.add(name);
          });
          merged.set(mesaKey, {
            ...current,
            numero: current.numero ?? mesa.numero,
            esMesaTestigo: current.esMesaTestigo || mesa.esMesaTestigo,
            fiscales: fiscales.size > 0 ? Array.from(fiscales) : undefined,
          });
        });
        const mergedList = Array.from(merged.values()).sort((a, b) => {
          const aNumero = a.numero ?? '';
          const bNumero = b.numero ?? '';
          if (!aNumero && bNumero) return 1;
          if (aNumero && !bNumero) return -1;
          return aNumero.localeCompare(bNumero, undefined, { numeric: true, sensitivity: 'base' });
        });
        existing.mesas = mergedList;
      }
    }
  }

  Object.values(value).forEach((nested) => {
    if (nested && typeof nested === 'object') {
      collectEstablecimientos(nested, results, visited);
    }
  });
};

const extractEstablecimientos = (data?: FiscalData | null): EstablecimientoCard[] => {
  if (!data) return [];
  const record = data as Record<string, unknown>;
  const visited = new Set<unknown>();
  const results = new Map<string, EstablecimientoCard>();

  ESTABLECIMIENTOS_KEYS.forEach((key) => {
    if (key in record) {
      collectEstablecimientos(record[key], results, visited);
    }
  });

  return Array.from(results.values());
};

// helper: Blob -> dataURL para preview
const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });

type MesaFiscalCardData = {
  id: string;
  mesa: string;
  nombre: string;
  telefono?: string;
  esMesaTestigo: boolean;
};

type EstablecimientoCardData = {
  id: string;
  nombre: string;
  direccion?: string;
  locationUrl?: string;
  fiscalGeneral?: string;
  fiscalGeneralTelefono?: string;
};

const MESA_NUMBER_KEYS = [
  'mesa',
  'mesa_nro',
  'mesaNumero',
  'mesa_numero',
  'numero_mesa',
  'mesa_id',
  'mesaId',
  'numero',
  'mesaAsignada',
  'mesa_asignada',
] as const;

/*const PHONE_KEYS = [
  'telefono',
  'tel',
  'telefono_contacto',
  'telefonoContacto',
  'telefono_fiscal',
  'telefonoFiscal',
  'celular',
  'cel',
  'whatsapp',
  'telefono_movil',
  'movil',
] as const;
*/
const TESTIGO_BOOLEAN_KEYS = [
  'mesa_testigo',
  'es_mesa_testigo',
  'es_testigo',
  'esTestigo',
  'mesaTestigo',
  'mesaEsTestigo',
] as const;

const TESTIGO_LABEL_KEYS = [
  'tipo_mesa',
  'tipoMesa',
  'categoria_mesa',
  'categoria',
  'tipo',
  'clasificacion',
] as const;

const ESTABLISHMENT_NAME_KEYS = [
  'nombre_establecimiento',
  'nombre_establecimiento_fiscalizacion',
  'nombre_escuela',
  'nombre',
  'escuela',
  'establecimiento',
  'colegio',
  'lugar',
  'nombre_lugar',
  'institucion',
] as const;

const ESTABLISHMENT_ADDRESS_KEYS = [
  'direccion_establecimiento',
  'direccion_establecimiento_fiscalizacion',
  'direccion_escuela',
  'direccion',
  'domicilio',
  'ubicacion',
  'calle',
  'direccion_lugar',
] as const;

const ESTABLISHMENT_INDICATOR_KEYS = [
  'establecimiento',
  'establecimientos',
  'nombre_establecimiento',
  'nombre_establecimiento_fiscalizacion',
  'nombre_escuela',
  'escuela',
  'colegio',
  'institucion',
  'lugar',
  'nombre_lugar',
] as const;

const LOCATION_LINK_KEYS = [
  'ubicacion_link',
  'ubicacion_url',
  'maps_url',
  'mapsUrl',
  'link_ubicacion',
  'google_maps',
  'googleMaps',
  'mapa',
] as const;

const LOCATION_OBJECT_KEYS = [
  'ubicacion',
  'coordenadas',
  'coordenada',
  'location',
  'geo',
] as const;

const FISCAL_GENERAL_CONTAINER_KEYS = [
  'fiscal_general',
  'fiscalGeneral',
  'fiscal-general',
  'fg',
  'f_g',
  'fiscal_general_asignado',
  'fiscal_general_datos',
  'fiscalGeneralAsignado',
] as const;

const FISCAL_GENERAL_NAME_KEYS = [
  'fiscal_general_nombre',
  'nombre_fiscal_general',
  'fg_nombre',
  'fiscalGeneralNombre',
  'nombre_fg',
] as const;

const FISCAL_GENERAL_PHONE_KEYS = [
  'fiscal_general_telefono',
  'telefono_fiscal_general',
  'fg_telefono',
  'telefono_fg',
  'celular_fg',
  'whatsapp_fg',
  'telefono',
  'celular',
  'whatsapp',
] as const;

const DISPLAY_NAME_KEYS = ['displayName', 'nombre_completo', 'nombreCompleto'] as const;
const FIRST_NAME_KEYS = ['nombres', 'nombre', 'primer_nombre', 'nombre1', 'first_name'] as const;
const LAST_NAME_KEYS = ['apellidos', 'apellido', 'apellido1', 'segundo_apellido', 'last_name'] as const;

const buildMapsUrl = (raw?: string): string | undefined => {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (/^https?:/i.test(trimmed)) return trimmed;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;
};

const extractNumberValue = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.replace(/,/g, '.').trim();
    if (!normalized) return undefined;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const extractStringValue = (value: unknown, depth = 0): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? `${value}` : undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = extractStringValue(item, depth + 1);
      if (result) return result;
    }
    return undefined;
  }

  if (value && typeof value === 'object' && depth < 3) {
    const record = value as Record<string, unknown>;
    for (const key of [
      ...DISPLAY_NAME_KEYS,
      'nombre',
      'name',
      'descripcion',
      'description',
      'value',
      'texto',
      'label',
      'title',
    ]) {
      if (key in record) {
        const nested = extractStringValue(record[key], depth + 1);
        if (nested) return nested;
      }
    }
  }

  return undefined;
};

const extractBooleanValue = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0 ? true : value === 0 ? false : undefined;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;
    if (['true', '1', 'si', 'sí', 's', 'y', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  }
  return undefined;
};

const pickFirstStringFromRecord = (
  record: Record<string, unknown>,
  keys: readonly string[],
): string | undefined => {
  for (const key of keys) {
    if (!(key in record)) continue;
    const value = extractStringValue(record[key]);
    if (value) return value;
  }
  return undefined;
};

const pickFirstBooleanFromRecord = (
  record: Record<string, unknown>,
  keys: readonly string[],
): boolean | undefined => {
  for (const key of keys) {
    if (!(key in record)) continue;
    const value = extractBooleanValue(record[key]);
    if (value !== undefined) return value;
  }
  return undefined;
};

const extractNameFromRecord = (
  record: Record<string, unknown>,
  visited?: WeakSet<object>,
): string | undefined => {
  const tracker = visited ?? new WeakSet<object>();
  if (tracker.has(record)) return undefined;
  tracker.add(record);

  const direct = pickFirstStringFromRecord(record, DISPLAY_NAME_KEYS);
  if (direct) return direct;

  const first = pickFirstStringFromRecord(record, FIRST_NAME_KEYS);
  const last = pickFirstStringFromRecord(record, LAST_NAME_KEYS);
  const combined = [first, last].filter(Boolean).join(' ').trim();
  if (combined) return combined;

  const personaValue = record['persona'];
  if (typeof personaValue === 'string') {
    const trimmed = personaValue.trim();
    if (trimmed) return trimmed;
  } else if (personaValue && typeof personaValue === 'object') {
    const personaName = extractNameFromRecord(personaValue as Record<string, unknown>, tracker);
    if (personaName) return personaName;
  }

  for (const key of ['fiscal', 'miembro', 'usuario']) {
    const nested = record[key];
    if (!nested) continue;
    if (typeof nested === 'string') {
      const trimmed = nested.trim();
      if (trimmed) return trimmed;
    } else if (typeof nested === 'object') {
      const nestedName = extractNameFromRecord(nested as Record<string, unknown>, tracker);
      if (nestedName) return nestedName;
    }
  }

  return undefined;
};

const resolveMesaValue = (record: Record<string, unknown>): string | undefined => {
  const direct = pickFirstStringFromRecord(record, MESA_NUMBER_KEYS);
  if (direct) return direct;

  const mesaField = record['mesa'];
  if (typeof mesaField === 'string' || typeof mesaField === 'number') {
    return extractStringValue(mesaField);
  }
  if (mesaField && typeof mesaField === 'object') {
    const nested = pickFirstStringFromRecord(mesaField as Record<string, unknown>, MESA_NUMBER_KEYS);
    if (nested) return nested;
  }

  const mesas = record['mesas'];
  if (Array.isArray(mesas)) {
    for (const item of mesas) {
      if (!item) continue;
      if (typeof item === 'string' || typeof item === 'number') {
        const str = extractStringValue(item);
        if (str) return str;
      }
      if (typeof item === 'object') {
        const nested = resolveMesaValue(item as Record<string, unknown>);
        if (nested) return nested;
      }
    }
  }

  return undefined;
};

const resolveEstablecimientoName = (
  record: Record<string, unknown>,
  visited?: WeakSet<object>,
): string | undefined => {
  const tracker = visited ?? new WeakSet<object>();
  if (tracker.has(record)) return undefined;
  tracker.add(record);

  const direct = pickFirstStringFromRecord(record, ESTABLISHMENT_NAME_KEYS);
  if (direct) return direct;

  for (const key of ['establecimiento', 'escuela', 'colegio', 'lugar', 'institucion']) {
    if (!(key in record)) continue;
    const value = record[key];
    if (!value) continue;
    if (typeof value === 'string' || typeof value === 'number') {
      const str = extractStringValue(value);
      if (str) return str;
    }
    if (typeof value === 'object') {
      const nested = resolveEstablecimientoName(value as Record<string, unknown>, tracker);
      if (nested) return nested;
    }
  }

  return undefined;
};

const resolveDireccionValue = (
  record: Record<string, unknown>,
  visited?: WeakSet<object>,
): string | undefined => {
  const tracker = visited ?? new WeakSet<object>();
  if (tracker.has(record)) return undefined;
  tracker.add(record);

  const direct = pickFirstStringFromRecord(record, ESTABLISHMENT_ADDRESS_KEYS);
  if (direct) return direct;

  for (const key of [
    'direccion',
    'domicilio',
    'ubicacion',
    'location',
    'establecimiento',
    'escuela',
    'colegio',
    'lugar',
  ]) {
    if (!(key in record)) continue;
    const value = record[key];
    if (!value) continue;
    if (typeof value === 'string' || typeof value === 'number') {
      const str = extractStringValue(value);
      if (str) return str;
    }
    if (typeof value === 'object') {
      const nested = resolveDireccionValue(value as Record<string, unknown>, tracker);
      if (nested) return nested;
    }
  }

  return undefined;
};

const extractLocationUrlFromRecord = (
  record: Record<string, unknown>,
  visited?: WeakSet<object>,
): string | undefined => {
  const tracker = visited ?? new WeakSet<object>();
  if (tracker.has(record)) return undefined;
  tracker.add(record);

  for (const key of LOCATION_LINK_KEYS) {
    if (!(key in record)) continue;
    const value = extractStringValue(record[key]);
    const url = buildMapsUrl(value);
    if (url) return url;
  }

  for (const key of LOCATION_OBJECT_KEYS) {
    if (!(key in record)) continue;
    const value = record[key];
    if (!value) continue;
    if (typeof value === 'string') {
      const url = buildMapsUrl(value);
      if (url) return url;
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') {
          const url = buildMapsUrl(item);
          if (url) return url;
        } else if (item && typeof item === 'object') {
          const nested = extractLocationUrlFromRecord(item as Record<string, unknown>, tracker);
          if (nested) return nested;
        }
      }
    } else if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const lat =
        extractNumberValue(obj['lat']) ??
        extractNumberValue(obj['latitude']) ??
        extractNumberValue(obj['latitud']);
      const lng =
        extractNumberValue(obj['lng']) ??
        extractNumberValue(obj['lon']) ??
        extractNumberValue(obj['long']) ??
        extractNumberValue(obj['longitude']) ??
        extractNumberValue(obj['longitud']);
      if (lat !== undefined && lng !== undefined) {
        const url = buildMapsUrl(`${lat},${lng}`);
        if (url) return url;
      }
      const nested = extractLocationUrlFromRecord(obj, tracker);
      if (nested) return nested;
    }
  }

  const direccion = resolveDireccionValue(record);
  if (direccion) {
    const url = buildMapsUrl(direccion);
    if (url) return url;
  }

  return undefined;
};

const extractFiscalGeneralInfo = (
  record: Record<string, unknown>,
  visited?: WeakSet<object>,
): { nombre?: string; telefono?: string } | null => {
  const tracker = visited ?? new WeakSet<object>();
  if (tracker.has(record)) return null;
  tracker.add(record);

  let nombre = pickFirstStringFromRecord(record, FISCAL_GENERAL_NAME_KEYS) || undefined;
  let telefono = pickFirstStringFromRecord(record, FISCAL_GENERAL_PHONE_KEYS);

  for (const key of FISCAL_GENERAL_CONTAINER_KEYS) {
    if (!(key in record)) continue;
    const value = record[key];
    if (typeof value === 'string') {
      if (!nombre) {
        const trimmed = value.trim();
        if (trimmed) nombre = trimmed;
      }
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (!item || typeof item !== 'object') continue;
        const nested = extractFiscalGeneralInfo(item as Record<string, unknown>, tracker);
        if (nested?.nombre && !nombre) nombre = nested.nombre;
        if (nested?.telefono && !telefono) telefono = nested.telefono;
        if (nombre && telefono) break;
      }
    } else if (value && typeof value === 'object') {
      const nested = extractFiscalGeneralInfo(value as Record<string, unknown>, tracker);
      if (nested?.nombre && !nombre) nombre = nested.nombre;
      if (nested?.telefono && !telefono) telefono = nested.telefono;
    }
    if (nombre && telefono) break;
  }

  if (!telefono) {
    const personaValue = record['persona'];
    if (personaValue && typeof personaValue === 'object') {
      telefono = pickFirstStringFromRecord(personaValue as Record<string, unknown>, PHONE_KEYS) || telefono;
    }
  }

  if (!nombre) {
    const personaValue = record['persona'];
    if (typeof personaValue === 'string') {
      const trimmed = personaValue.trim();
      if (trimmed) nombre = trimmed;
    } else if (personaValue && typeof personaValue === 'object') {
      nombre = extractNameFromRecord(personaValue as Record<string, unknown>, tracker) || nombre;
    }
  }

  if (nombre || telefono) {
    return { nombre: nombre ?? undefined, telefono: telefono ?? undefined };
  }

  return null;
};

const extractMesaFiscales = (data: unknown): MesaFiscalCardData[] => {
  if (!data || typeof data !== 'object') return [];
  const results: MesaFiscalCardData[] = [];
  const visited = new WeakSet<object>();
  const seen = new Set<string>();

  const traverse = (value: unknown, isRoot = false) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((item) => traverse(item, false));
      return;
    }
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if (visited.has(obj)) return;
      visited.add(obj);

      if (!isRoot) {
        const mesa = resolveMesaValue(obj);
        const nombre = extractNameFromRecord(obj);
        if (mesa && nombre) {
          const telefono =
            pickFirstStringFromRecord(obj, PHONE_KEYS) ||
            (typeof obj['persona'] === 'object'
              ? pickFirstStringFromRecord(obj['persona'] as Record<string, unknown>, PHONE_KEYS)
              : undefined);
          const isTestigo = pickFirstBooleanFromRecord(obj, TESTIGO_BOOLEAN_KEYS);
          let esMesaTestigo = isTestigo === true;
          if (!esMesaTestigo) {
            const label = pickFirstStringFromRecord(obj, TESTIGO_LABEL_KEYS);
            if (label && label.toLowerCase().includes('testigo')) {
              esMesaTestigo = true;
            }
          }
          const key = `${mesa}|${nombre}|${telefono ?? ''}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push({
              id: key || `fiscal-${results.length}`,
              mesa,
              nombre,
              telefono: telefono ?? undefined,
              esMesaTestigo,
            });
          }
        }
      }

      Object.values(obj).forEach((child) => traverse(child, false));
    }
  };

  traverse(data, true);
  return results.sort((a, b) => a.mesa.localeCompare(b.mesa, undefined, { numeric: true }));
};

const buildTelHref = (value: string): string | undefined => {
  const digits = value.replace(/[^0-9+]/g, '');
  if (!digits) return undefined;
  return `tel:${digits}`;
};

const FiscalizacionActions: React.FC = () => {
  const history = useHistory();
  const { fiscalData, hasFiscalData, setFiscalData } = useFiscalData();

  // FOTO: ahora guardamos el BLOB real + un dataURL para el <img/>
  const [fotoBlob, setFotoBlob] = useState<Blob | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string>(localStorage.getItem('fotoActa') || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const memberNameParts: MemberNameParts = useMemo(
    () => getMemberNameParts(fiscalData ?? undefined),
    [fiscalData],
  );
  
  const memberName = useMemo(() => {
    const { apellidos, nombres, displayName } = memberNameParts;
    if (displayName) return displayName;
    if (apellidos && nombres) return `${apellidos}, ${nombres}`;
    return apellidos || nombres || '';
  }, [memberNameParts]);

  const memberType = useMemo(() => {
    if (!fiscalData) return '';
    const potentialValues = [fiscalData.nombre_tipo_miembro, fiscalData.tipo_fiscal];
    for (const value of potentialValues) {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) return trimmed;
      }
    }
    return '';
  }, [fiscalData]);

  const normalizedMemberType = useMemo(() => memberType.trim().toUpperCase(), [memberType]);

  const isFiscalGeneral = useMemo(
    () => normalizedMemberType.includes('FISCAL GENERAL'),
    [normalizedMemberType],
  );

  const isFiscalZonal = useMemo(
    () => normalizedMemberType.includes('FISCAL ZONAL'),
    [normalizedMemberType],
  );

  const isFiscalMesa = useMemo(
    () => normalizedMemberType.includes('FISCAL DE MESA') || normalizedMemberType.includes('FISCAL MESA'),
    [normalizedMemberType],
  );

  const fiscalesMesa = useMemo(() => extractFiscalesDeMesa(fiscalData ?? undefined), [fiscalData]);
  const previousFiscalesMesaLength = useRef(fiscalesMesa.length);
  const fiscalesMesaSummary = useMemo(() => {
    if (fiscalesMesa.length === 0) return undefined;
    const items = fiscalesMesa.map((fiscal) => {
      const nombre = fiscal.nombre?.trim();
      const mesa = fiscal.mesa ? `${fiscal.mesa}`.trim() : '';
      if (nombre && mesa) return `${nombre} - Mesa ${mesa}`;
      if (nombre) return nombre;
      if (mesa) return `Mesa ${mesa}`;
      return undefined;
    });
    const filtered = items.filter((item): item is string => Boolean(item));
    if (filtered.length === 0) return undefined;
    return filtered.join(' • ');
  }, [fiscalesMesa]);
  const establecimientosAsignados = useMemo(
    () => extractEstablecimientos(fiscalData ?? undefined),
    [fiscalData],
  );
  const fiscalGeneralContact = useMemo(
    () => extractRoleContact(fiscalData ?? undefined, FISCAL_GENERAL_CONTACT_CONFIG),
    [fiscalData],
  );
  const fiscalZonalContact = useMemo(
    () => extractRoleContact(fiscalData ?? undefined, FISCAL_ZONAL_CONTACT_CONFIG),
    [fiscalData],
  );

  const shouldShowFiscalGeneralContact = useMemo(
    () => Boolean(fiscalGeneralContact) && !isFiscalGeneral && !isFiscalZonal,
    [fiscalGeneralContact, isFiscalGeneral, isFiscalZonal],
  );

  const shouldShowFiscalZonalContact = useMemo(
    () => Boolean(fiscalZonalContact) && !isFiscalZonal,
    [fiscalZonalContact, isFiscalZonal],
  );

  /*const isFiscalZonal = memberTypeNormalized === 'FISCAL ZONAL';
  const isFiscalGeneral = memberTypeNormalized === 'FISCAL GENERAL';

  const mesaFiscales = useMemo(
    () => extractMesaFiscales(fiscalData ?? undefined),
    [fiscalData],
  );*/

  /*const establecimientosZonales = useMemo(
    () => extractEstablecimientos(fiscalData ?? undefined),
    [fiscalData],
  );*/

  const zonaEleccionNombre = useMemo(() => {
    if (!fiscalData) return undefined;
    const zonaEleccion = (fiscalData as Record<string, unknown>)['zonaEleccion'];
    if (zonaEleccion && typeof zonaEleccion === 'object' && !Array.isArray(zonaEleccion)) {
      const zonaRecord = zonaEleccion as Record<string, unknown>;
      return (
        str(zonaRecord['nombre']) ||
        str(zonaRecord['descripcion']) ||
        (() => {
          const numero = zonaRecord['numero'];
          if (typeof numero === 'number' || typeof numero === 'string') {
            const formatted = `${numero}`.trim();
            return formatted || undefined;
          }
          return undefined;
        })()
      );
    }
    return undefined;
  }, [fiscalData]);

  const memberZone = useMemo(() => {
    if (!fiscalData) return '';
    const value = typeof fiscalData.nombre_zona === 'string' ? fiscalData.nombre_zona.trim() : '';
    return value;
  }, [fiscalData]);

  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [establecimientoForm, setEstablecimientoForm] = useState<EstablecimientoFormState>({
    seccion: '',
    circuito: '',
    mesa: '',
    nombre: '',
  });
  const [isSendingPhoto, setIsSendingPhoto] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [useCustomMesa, setUseCustomMesa] = useState(false);
  const [showFiscalesMesa, setShowFiscalesMesa] = useState(false);
  const [showEstablecimientosModal, setShowEstablecimientosModal] = useState(false);
  const [mesasModalState, setMesasModalState] = useState<MesasModalState | null>(null);

  const fechaEnvio = new Date().toISOString();
  const fileDescriptor = '';

  const personaRecord = useMemo(() => {
    if (!fiscalData) return undefined;
    const record = fiscalData as unknown as Record<string, unknown>;
    const nested = record['persona'];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return nested as Record<string, unknown>;
    }
    return undefined;
  }, [fiscalData]);

  const personaDni = useMemo(() => {
    const fiscalRecord = (fiscalData ?? undefined) as Record<string, unknown> | undefined;
    const candidates: unknown[] = [
      user?.dni,
      fiscalRecord?.['dni_miembro'],
      fiscalRecord?.['dni'],
      personaRecord?.['dni'],
      personaRecord?.['documento'],
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'number' || typeof candidate === 'string') {
        const asString = `${candidate}`.trim();
        if (asString) return asString;
      }
    }
    return '';
  }, [fiscalData, personaRecord, user]);

  const personaEmail = useMemo(() => {
    const fiscalRecord = (fiscalData ?? undefined) as Record<string, unknown> | undefined;
    const candidates: unknown[] = [
      user?.email,
      fiscalRecord?.['email'],
      fiscalRecord?.['correo'],
      fiscalRecord?.['mail'],
      personaRecord?.['email'],
      personaRecord?.['correo'],
      personaRecord?.['mail'],
    ];
    for (const candidate of candidates) {
      const value = str(candidate);
      if (value) return value;
    }
    return '';
  }, [fiscalData, personaRecord, user]);

  const personaPayload = useMemo(
    () => ({
      dni: personaDni,
      nombre: memberNameParts.nombres ?? '',
      apellido: memberNameParts.apellidos ?? '',
      email: personaEmail ?? '',
    }),
    [memberNameParts, personaDni, personaEmail],
  );

  const {
    mesa: mesaAsignadaDesdeData,
    lugar: lugarAsignadoDesdeData,
    establecimiento: establecimientoDesdeData,
    direccion: direccionDesdeData,
  } = useMemo(() => getFiscalAssignmentDetails(fiscalData ?? undefined), [fiscalData]);
  const readStoredAssignmentValue = useCallback(
    (keys: string[], preferredNestedKeys: readonly string[]): string | undefined => {
      for (const key of keys) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const trimmed = raw.trim();
        if (!trimmed) continue;

        try {
          const parsed = JSON.parse(trimmed);
          if (typeof parsed === 'string') {
            const value = parsed.trim();
            if (value) return value;
          } else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const parsedRecord = parsed as Record<string, unknown>;
            for (const nestedKey of preferredNestedKeys) {
              const value = parsedRecord[nestedKey];
              if (typeof value === 'string') {
                const nestedTrimmed = value.trim();
                if (nestedTrimmed) return nestedTrimmed;
              }
            }
            for (const value of Object.values(parsedRecord)) {
              if (typeof value === 'string') {
                const nestedTrimmed = value.trim();
                if (nestedTrimmed) return nestedTrimmed;
              }
            }
          }
        } catch {
          return trimmed;
        }
        return trimmed;
      }
      return undefined;
    },
    [],
  );

  const mesaAsignada = useMemo(() => {
    if (mesaAsignadaDesdeData) return mesaAsignadaDesdeData;
    if (isRecord(fiscalData)) {
      const extracted = extractMesaNumero(fiscalData);
      if (extracted) return extracted;
      const nestedMesa = fiscalData['mesa_asignada'] ?? fiscalData['mesaAsignada'];
      if (isRecord(nestedMesa)) {
        const nestedExtracted = extractMesaNumero(nestedMesa as Record<string, unknown>);
        if (nestedExtracted) return nestedExtracted;
      }
    }
    if (typeof window === 'undefined') return undefined;
    const storedMesa = localStorage.getItem('mesa_nro');
    console.log('stored mesa nro ' + storedMesa)
    return storedMesa?.trim() ? storedMesa.trim() : undefined;
  }, [fiscalData, mesaAsignadaDesdeData]);

  const mesaAsignadaDisplay = useMemo(() => {
    const trimmed = typeof mesaAsignada === 'string' ? mesaAsignada.trim() : '';
    if (!trimmed) return undefined;
    if (/^0+$/.test(trimmed)) return undefined;
    if (isFiscalGeneral && !isFiscalMesa) return undefined;
    return trimmed;
  }, [isFiscalGeneral, isFiscalMesa, mesaAsignada]);

  const isMesaTestigoAsignada = useMemo(() => {
    if (!isRecord(fiscalData)) return false;
    return extractIsMesaTestigo(fiscalData);
  }, [fiscalData]);

  const establecimientoAsignado = useMemo(() => {
    if (establecimientoDesdeData) return establecimientoDesdeData;
    if (typeof window === 'undefined') return undefined;
    return readStoredAssignmentValue(
      [
        'nombre_establecimiento',
        'nombreEstablecimiento',
        'nombre_establecimiento_fiscalizacion',
        'establecimiento_fiscalizacion',
        'nombre_escuela',
        'nombreEscuela',
        'escuela',
        'establecimiento',
        'lugar',
      ],
      ['nombre', 'name', 'descripcion', 'description', 'lugar'],
    );
  }, [establecimientoDesdeData, readStoredAssignmentValue]);

  const direccionAsignada = useMemo(() => {
    if (direccionDesdeData) return direccionDesdeData;
    if (typeof window === 'undefined') return undefined;
    const fallback = readStoredAssignmentValue(
      [
        'direccion_establecimiento',
        'direccionEstablecimiento',
        'direccion_establecimiento_fiscalizacion',
        'establecimiento_fiscalizacion',
        'direccion_escuela',
        'direccionEscuela',
        'direccion',
        'domicilio',
        'ubicacion',
        'establecimiento',
      ],
      ['direccion', 'domicilio', 'ubicacion', 'address', 'calle'],
    );
    if (fallback) return fallback;

    const seccion = localStorage.getItem('seccion')?.trim();
    const circuito = localStorage.getItem('circuito')?.trim();
    const parts = [seccion ? `Sección ${seccion}` : null, circuito ? `Circuito ${circuito}` : null]
      .filter(Boolean)
      .join(' · ');
    return parts || undefined;
  }, [direccionDesdeData, readStoredAssignmentValue]);

  const lugarAsignado = useMemo(() => {
    if (lugarAsignadoDesdeData) return lugarAsignadoDesdeData;
    if (typeof window === 'undefined') return undefined;
    const storedLugar = localStorage.getItem('lugar');
    if (storedLugar?.trim()) return storedLugar.trim();
    return establecimientoAsignado || undefined;
  }, [establecimientoAsignado, lugarAsignadoDesdeData]);

  const mesaOptions = useMemo(() => {
    const values = new Set<string>();
    const addValue = (value: unknown) => {
      if (value === null || value === undefined) return;
      const trimmed = `${value}`.trim();      
      if (trimmed) values.add(trimmed);
    };

    addValue(mesaAsignada);

    const record = fiscalData as
      | ({
          f_g_asignado?: { mesas?: Array<FDMesa> };
          establecimiento_fiscalizacion?: FDEstablecimiento | null;
        } & Record<string, unknown>)
      | null
      | undefined;
    const mesas = record?.f_g_asignado?.mesas;
    if (Array.isArray(mesas)) {
      mesas.forEach((mesa) => {
        addValue(mesa?.numero);
      });
    }

    const establecimiento = record?.establecimiento_fiscalizacion;
    if (establecimiento && typeof establecimiento === 'object' && !Array.isArray(establecimiento)) {
      const mesasEstablecimiento = establecimiento.mesas;
      if (Array.isArray(mesasEstablecimiento)) {
        mesasEstablecimiento.forEach((mesa) => {
          addValue(mesa?.numero);
        });
      }
    }

    if (typeof window !== 'undefined') {
      addValue(localStorage.getItem('mesa_nro'));
      addValue(localStorage.getItem('mesaId'));
    }

    return Array.from(values).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [fiscalData, mesaAsignada]);

  const clearFotoState = useCallback(() => {
    setFotoBlob(null);
    setFotoPreview('');
    localStorage.removeItem('fotoActa');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleMesaSelectChange = useCallback((value: string | null | undefined) => {
    if (value === '__custom__') {
      setUseCustomMesa(true);
      setEstablecimientoForm((prev) => ({
        ...prev,
        mesa: '',
      }));
      return;
    }

    const formatted = value ? `${value}`.trim() : '';
    setUseCustomMesa(false);
    setEstablecimientoForm((prev) => ({
      ...prev,
      mesa: formatted,
    }));
  }, []);

  const handleMesaInputChange = useCallback((value: string) => {
    setEstablecimientoForm((prev) => ({
      ...prev,
      mesa: value,
    }));
  }, []);

  const handleOpenModal = () => {
    const storedSeccion = localStorage.getItem('seccion')?.trim() ?? '';
    const storedCircuito = localStorage.getItem('circuito')?.trim() ?? '';
    const storedMesa = localStorage.getItem('mesa_nro')?.trim();
    const defaultMesa = storedMesa || mesaAsignada || mesaOptions[0] || '';
    setEstablecimientoForm({
      seccion: storedSeccion,
      circuito: storedCircuito,
      mesa: defaultMesa,
      nombre: establecimientoAsignado ?? '',
    });
    setUseCustomMesa(
      !defaultMesa || (defaultMesa ? !mesaOptions.includes(defaultMesa) : mesaOptions.length === 0),
    );
    setSendError(null);
    setShowPhotoModal(true);
  };

  const handleCloseModal = () => {
    if (isSendingPhoto) return;
    setShowPhotoModal(false);
  };

  // === enviarFoto: ahora usa FormData con clave 'file' ===
  const enviarFoto = useCallback(async () => {
    if (!fotoBlob) {
      setSendError('Debes tomar o subir una foto antes de enviarla.');
      return;
    }

    const mesaSeleccionada = establecimientoForm.mesa.trim();
    if (!mesaSeleccionada) {
      setSendError('Debes seleccionar una mesa antes de enviar la foto.');
      return;
    }

    const establecimientoPayload = {
      seccion: establecimientoForm.seccion.trim(),
      circuito: establecimientoForm.circuito.trim(),
      mesa: mesaSeleccionada,
      nombre: establecimientoForm.nombre.trim(),
    };

    const fd = new FormData();
    fd.append('file', fotoBlob, 'acta.jpg'); // clave EXACTA que espera el backend
    fd.append('fecha', fechaEnvio);
    fd.append('establecimiento', JSON.stringify(establecimientoPayload));
    fd.append('persona', JSON.stringify(personaPayload));
    try {
      setIsSendingPhoto(true);
      setSendError(null);

      const raw = localStorage.getItem('token') || '';

      const response = await fetch(
        'https://api.lalibertadavanzacomuna7.com/api/actasFoto/enviar-foto',
        {
          method: 'POST',
          headers: {
            // NO seteamos Content-Type; el navegador lo arma con boundary
            Accept: 'application/json',
            Authorization: raw,
          },
          body: fd,
        },
      );

      if (!response.ok) {
        let msg = response.statusText;
        try {
          const j = await response.json();
          msg = j?.mensaje || j?.message || msg;
        } catch {
          msg = (await response.text()) || msg;
        }
        throw new Error(`No se pudo enviar la foto (${response.status}): ${msg}`);
      }

      localStorage.setItem('mesa_nro', mesaSeleccionada);
      localStorage.setItem('mesaId', mesaSeleccionada);
      setSendError(null);
      clearFotoState();
      setShowPhotoModal(false);
      history.replace('/fiscalizacion-acciones');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido al enviar la foto.';
      setSendError(message);
    } finally {
      setIsSendingPhoto(false);
    }
  }, [
    clearFotoState,
    establecimientoForm,
    fechaEnvio,
    fotoBlob,
    history,
    personaPayload,
  ]);

  const handleConfirmModal = () => {
    void enviarFoto();
  };

  const metadataLabelClass = 'text-sm text-gray-600';
  const metadataValueClass = 'font-medium text-gray-700';

  const getTelHref = useCallback((value?: string) => {
    if (!value || !isLikelyPhone(value)) return undefined;
    const normalized = value.replace(/[^+\d]/g, '').trim();
    return normalized ? `tel:${normalized}` : undefined;
  }, []);

  const handleOpenGeneralMesas = useCallback(() => {
    const groups = establecimientosAsignados.map((card) => ({
      establecimiento: card,
      mesas: card.mesas ?? [],
    }));
    setMesasModalState({
      title:
        establecimientosAsignados.length !== 1
          ? 'Mesas por establecimiento'
          : 'Mesas del establecimiento',
      groups,
      emptyMessage: 'No hay mesas registradas para este establecimiento.',
      noGroupsMessage: 'No hay establecimientos asignados.',
    });
  }, [establecimientosAsignados]);

  const handleOpenMesasForEstablecimiento = useCallback((card: EstablecimientoCard) => {
    setMesasModalState({
      title: card.nombre ? `Mesas de ${card.nombre}` : 'Mesas del establecimiento',
      groups: [
        {
          establecimiento: card,
          mesas: card.mesas ?? [],
        },
      ],
      emptyMessage: 'No hay mesas registradas para este establecimiento.',
      noGroupsMessage: 'No hay establecimientos asignados.',
    });
  }, []);

  const handleCloseMesasModal = useCallback(() => {
    setMesasModalState(null);
  }, []);

  const ensureCameraPermission = async () => {
    try {
      const current = await Camera.checkPermissions();
      if (current.camera === 'granted' || current.camera === 'limited') {
        return true;
      }

      const requested = await Camera.requestPermissions({ permissions: ['camera'] });
      return requested.camera === 'granted' || requested.camera === 'limited';
    } catch {
      return false;
    }
  };

  // Tomar foto con Camera -> Blob real + preview
  const handleFoto = async () => {
    const platform = Capacitor.getPlatform();
    if (platform === 'web') {
      fileInputRef.current?.click();
      return;
    }

    try {
      const hasPermission = await ensureCameraPermission();
      if (!hasPermission) {
        throw new Error('camera-permission-denied');
      }

      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri, // URI -> podemos fetchear el Blob real
        quality: 80,
        source: CameraSource.Camera,
        allowEditing: false,
        direction: CameraDirection.Rear,
      });
      if (photo.webPath) {
        const blob = await fetch(photo.webPath).then((r) => r.blob());
        setFotoBlob(blob);
        const preview = await blobToDataUrl(blob);
        setFotoPreview(preview);
        localStorage.setItem('fotoActa', preview);
      }
    } catch {
      fileInputRef.current?.click();
    }
  };

  // File input -> usamos File (Blob) y generamos preview
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoBlob(file);
    const preview = await blobToDataUrl(file);
    setFotoPreview(preview);
    localStorage.setItem('fotoActa', preview);
  };

  const coords = useMemo<{ lat: number; lng: number } | undefined>(() => {
    const fd = (fiscalData as unknown as FiscalDataGeo) || null;
    if (!fd) return undefined;
    const u = fd.ubicacion ?? fd.establecimiento_fiscalizacion?.ubicacion;
    const lat = toNumber(u?.lat);
    const lng = toNumber(u?.lng);
    return lat !== undefined && lng !== undefined ? { lat, lng } : undefined;
  }, [fiscalData]);

  const mapsQuery = useMemo<string | undefined>(() => {
    if (coords) return `${coords.lat},${coords.lng}`;
    return undefined;
  }, [coords]);

  const SHOW_DEBUG = false;

  const ionItemStyle: CSSProperties = {
    ['--inner-padding-top' as unknown as string]: '12px',
    ['--inner-padding-bottom' as unknown as string]: '12px',
    ['--min-height' as unknown as string]: '64px',
    borderRadius: '8px',
  };

  const handleClearFoto = () => {
    clearFotoState();
  };

  const mesaSelectValue = useCustomMesa ? '__custom__' : establecimientoForm.mesa;

  useEffect(() => {
    const lastLength = previousFiscalesMesaLength.current;
    if (fiscalesMesa.length === 0 && lastLength > 0) {
      setShowFiscalesMesa(false);
    }
    previousFiscalesMesaLength.current = fiscalesMesa.length;
  }, [fiscalesMesa.length]);

  useEffect(() => {
    if (establecimientosAsignados.length === 0 && showEstablecimientosModal) {
      setShowEstablecimientosModal(false);
    }
  }, [establecimientosAsignados.length, showEstablecimientosModal]);

  useEffect(() => {
    if (!hasFiscalData) {
      const stored = localStorage.getItem('fiscalData');
      if (stored) {
        try {
          setFiscalData(JSON.parse(stored) as FiscalData);
        } catch {
          history.replace('/fiscalizacion-lookup');
        }
      } else {
        history.replace('/fiscalizacion-lookup');
      }
    }
  }, [hasFiscalData, history, setFiscalData]);

  return (
    <Layout backHref="/fiscalizacion-lookup">
      <IonContent className="ion-padding">
        {fiscalData && (
          <IonItem lines="none" className="ion-margin-bottom rounded-lg bg-gray-100">
            <IonLabel>
              <h2 className="font-semibold text-base">Fiscal</h2>
              {memberName && <p className="text-sm">{memberName}</p>}
              {memberType && (
                <p className={metadataLabelClass}>
                  Tipo de fiscal: <span className={metadataValueClass}>{memberType}</span>
                </p>
              )}
              {mesaAsignadaDisplay && (
                <p className={metadataLabelClass}>
                  Mesa:{' '}
                  <span
                    className={
                      isFiscalMesa
                        ? isMesaTestigoAsignada
                          ? 'font-semibold uppercase tracking-wide text-red-600'
                          : 'font-semibold text-gray-800'
                        : metadataValueClass
                    }
                  >
                    {mesaAsignadaDisplay}
                  </span>
                  {isFiscalMesa && isMesaTestigoAsignada && (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                      Mesa Testigo
                    </span>
                  )}
                </p>
              )}
              {establecimientoAsignado && (
                <p className={metadataLabelClass}>
                  Escuela: <span className={metadataValueClass}>{establecimientoAsignado}</span>
                </p>
              )}
              {isFiscalZonal && zonaEleccionNombre && (
                <p className={metadataLabelClass}>
                  Zona de elección: <span className={metadataValueClass}>{zonaEleccionNombre}</span>
                </p>
              )}
              {!isFiscalZonal && direccionAsignada && (
                <p className={metadataLabelClass}>
                  Dirección: <span className={metadataValueClass}>{direccionAsignada}</span>
                </p>
              )}
              {lugarAsignado &&
                (!establecimientoAsignado || lugarAsignado !== establecimientoAsignado) && (
                  <p className={metadataLabelClass}>
                    Lugar: <span className={metadataValueClass}>{lugarAsignado}</span>
                  </p>
                )}
              {memberZone && (
                <p className={metadataLabelClass}>
                  Zona: <span className={metadataValueClass}>{memberZone}</span>
                </p>
              )}
            </IonLabel>
          </IonItem>
        )}

        {(shouldShowFiscalGeneralContact || shouldShowFiscalZonalContact) && (
          <div className="ion-margin-bottom flex flex-col gap-3">
            {shouldShowFiscalGeneralContact && fiscalGeneralContact && (
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Fiscal general de referencia
                </p>
                {fiscalGeneralContact.nombre && (
                  <p className="mt-1 text-base font-semibold text-gray-800">
                    {fiscalGeneralContact.nombre}
                  </p>
                )}
                {fiscalGeneralContact.telefono && (
                  <p className="mt-2 text-sm text-gray-600">
                    Teléfono:{' '}
                    {getTelHref(fiscalGeneralContact.telefono) ? (
                      <a
                        href={getTelHref(fiscalGeneralContact.telefono)}
                        className="font-medium text-blue-600 underline"
                      >
                        {fiscalGeneralContact.telefono}
                      </a>
                    ) : (
                      <span className="font-medium text-gray-800">
                        {fiscalGeneralContact.telefono}
                      </span>
                    )}
                  </p>
                )}
              </div>
            )}

            {shouldShowFiscalZonalContact && fiscalZonalContact && (
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Fiscal zonal de referencia
                </p>
                {fiscalZonalContact.nombre && (
                  <p className="mt-1 text-base font-semibold text-gray-800">
                    {fiscalZonalContact.nombre}
                  </p>
                )}
                {fiscalZonalContact.telefono && (
                  <p className="mt-2 text-sm text-gray-600">
                    Teléfono:{' '}
                    {getTelHref(fiscalZonalContact.telefono) ? (
                      <a
                        href={getTelHref(fiscalZonalContact.telefono)}
                        className="font-medium text-blue-600 underline"
                      >
                        {fiscalZonalContact.telefono}
                      </a>
                    ) : (
                      <span className="font-medium text-gray-800">
                        {fiscalZonalContact.telefono}
                      </span>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col items-center gap-4 w-4/5 mx-auto mt-4 pb-16">
          <Button onClick={handleFoto} className="flex flex-col items-center w-4/5">
            Tomar/Subir Foto
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            title="Subir foto del acta"
          />
          {fotoPreview && (
            <div className="flex flex-col items-center w-4/5">
              <img src={fotoPreview} alt="Foto del acta" className="max-w-xs mt-2 rounded shadow " />
              <Button size="small" color="danger" className="mt-2 w-4/5" onClick={handleClearFoto}>
                Borrar foto
              </Button>
              <Button
                size="small"
                color="success"
                className="mt-2 w-4/5"
                disabled={!fotoBlob || isSendingPhoto}
                onClick={handleOpenModal}
              >
                Enviar foto
              </Button>
            </div>
          )}

          <Button routerLink="/escrutinio" className="flex flex-col items-center w-4/5">
            Escrutinio
          </Button>

          {isFiscalGeneral && (
            <div className="flex w-full flex-col items-center gap-3">
              <Button
                className="flex flex-col items-center w-4/5"
                onClick={handleOpenGeneralMesas}
              >
                Mesas
              </Button>
              <Button
                className="flex flex-col items-center w-4/5"
                onClick={() => setShowFiscalesMesa((prev) => !prev)}
              >
                <span className="font-semibold">
                  {showFiscalesMesa ? 'Ocultar fiscales de mesa' : 'Fiscales de mesa'}
                </span>
                {!showFiscalesMesa && fiscalesMesaSummary && (
                  <span className="mt-1 text-center text-sm text-gray-700">
                    {fiscalesMesaSummary}
                  </span>
                )}
              </Button>
              {showFiscalesMesa && (
                <div className="flex w-full flex-col gap-3">
                  {fiscalesMesa.length === 0 ? (
                    <p className="text-center text-sm text-gray-600">
                      No hay fiscales de mesa asignados.
                    </p>
                  ) : (
                    fiscalesMesa.map((fiscal) => {
                      const telHref = getTelHref(fiscal.telefono);
                      return (
                        <div
                          key={fiscal.id}
                          className="w-full rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-base font-semibold text-gray-800">
                                {fiscal.nombre || 'Sin nombre'}
                              </p>
                              {fiscal.mesa && (
                                <p className="text-sm text-gray-600">
                                  Mesa:{' '}
                                  <span
                                    className={
                                      fiscal.isMesaTestigo
                                        ? 'font-semibold uppercase tracking-wide text-red-600'
                                        : 'font-medium text-gray-800'
                                    }
                                  >
                                    {fiscal.mesa}
                                  </span>
                                </p>
                              )}
                            </div>
                            {fiscal.isMesaTestigo && (
                              <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-red-700">
                                Mesa Testigo
                              </span>
                            )}
                          </div>
                          {fiscal.telefono && (
                            <p className="mt-2 text-sm text-gray-600">
                              Teléfono:{' '}
                              {telHref ? (
                                <a href={telHref} className="font-medium text-blue-600 underline">
                                  {fiscal.telefono}
                                </a>
                              ) : (
                                <span className="font-medium text-gray-800">{fiscal.telefono}</span>
                              )}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
          {isFiscalZonal && (
            <div className="flex w-full flex-col items-center gap-3">
              <Button
                className="flex flex-col items-center w-4/5"
                onClick={() => setShowEstablecimientosModal(true)}
              >
                Establecimientos
              </Button>
            </div>
          )}
      </div>
      {coords && (
        <IonItem lines="none" className="ion-margin-bottom rounded-lg overflow-hidden">
          <IonLabel>
            <p className="text-sm text-gray-600 mb-2">Mapa del establecimiento</p>
            {mapsQuery && (
              <a
                className="mb-2 inline-block text-sm font-medium text-blue-600 underline"
                href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir en Google Maps
              </a>
            )}
            <div className="w-full" style={{ height: 240, borderRadius: 8, overflow: 'hidden' }}>
              <iframe
                title="Mapa"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={
                  mapsQuery
                    ? `https://www.google.com/maps?q=${mapsQuery}&z=16&output=embed`
                    : ''
                }
              />
            </div>
          </IonLabel>
        </IonItem>
      )}
    </IonContent>

      <IonModal
        isOpen={showEstablecimientosModal}
        onDidDismiss={() => setShowEstablecimientosModal(false)}
      >
        <IonContent className="ion-padding">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-800">
                {isFiscalZonal ? 'Establecimientos asignados' : 'Establecimiento asignado'}
              </h2>
              <Button size="small" onClick={() => setShowEstablecimientosModal(false)}>
                Cerrar
              </Button>
            </div>
            {establecimientosAsignados.length === 0 ? (
              <p className="text-center text-sm text-gray-600">
                {isFiscalZonal
                  ? 'No hay establecimientos asignados.'
                  : 'No hay establecimiento asignado.'}
              </p>
            ) : (
              <div className="space-y-3">
                {establecimientosAsignados.map((establecimiento) => {
                  const telHref = getTelHref(establecimiento.telefono);
                  const mapsHref = establecimiento.mapsQuery
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        establecimiento.mapsQuery,
                      )}`
                    : undefined;
                  return (
                    <div
                      key={establecimiento.id}
                      className="w-full rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm"
                    >
                      {establecimiento.nombre && (
                        <p className="text-base font-semibold text-gray-800">
                          {establecimiento.nombre}
                        </p>
                      )}
                      {establecimiento.direccion && (
                        <p className="mt-1 text-sm text-gray-600">
                          Dirección:{' '}
                          <span className="font-medium text-gray-800">
                            {establecimiento.direccion}
                          </span>
                        </p>
                      )}
                      {mapsHref && (
                        <a
                          href={mapsHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-sm font-medium text-blue-600 underline"
                        >
                          Ver en Google Maps
                        </a>
                      )}
                      {(establecimiento.fiscalGeneral || establecimiento.telefono) && (
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          {establecimiento.fiscalGeneral && (
                            <p>
                              FG:{' '}
                              <span className="font-medium text-gray-800">
                                {establecimiento.fiscalGeneral}
                              </span>
                            </p>
                          )}
                          {establecimiento.telefono && (
                            <p>
                              Teléfono:{' '}
                              {telHref ? (
                                <a href={telHref} className="font-medium text-blue-600 underline">
                                  {establecimiento.telefono}
                                </a>
                              ) : (
                                <span className="font-medium text-gray-800">
                                  {establecimiento.telefono}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      )}
                      <Button
                        size="small"
                        className="mt-3 w-full"
                        onClick={() => handleOpenMesasForEstablecimiento(establecimiento)}
                      >
                        Mesas
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </IonContent>
      </IonModal>

      <IonModal isOpen={mesasModalState !== null} onDidDismiss={handleCloseMesasModal}>
        <IonContent className="ion-padding">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-800">
                {mesasModalState?.title ?? 'Mesas'}
              </h2>
              <Button size="small" onClick={handleCloseMesasModal}>
                Cerrar
              </Button>
            </div>
            {mesasModalState?.groups.length ? (
              mesasModalState.groups.map((group) => (
                <div key={group.establecimiento.id} className="space-y-3">
                  <div className="rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm">
                    {group.establecimiento.nombre && (
                      <p className="text-base font-semibold text-gray-800">
                        {group.establecimiento.nombre}
                      </p>
                    )}
                    {group.establecimiento.direccion && (
                      <p className="mt-1 text-sm text-gray-600">
                        Dirección:{' '}
                        <span className="font-medium text-gray-800">
                          {group.establecimiento.direccion}
                        </span>
                      </p>
                    )}
                    {group.mesas.length === 0 ? (
                      <p className="mt-2 text-sm text-gray-600">
                        {mesasModalState.emptyMessage}
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {group.mesas.map((mesa) => (
                          <div
                            key={mesa.id}
                            className="rounded-md border border-gray-200 bg-gray-50 p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-gray-800">
                                {mesa.numero ? `Mesa ${mesa.numero}` : 'Mesa sin número'}
                              </p>
                              {mesa.esMesaTestigo && (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                                  Mesa Testigo
                                </span>
                              )}
                            </div>
                            {mesa.fiscales?.length ? (
                              <ul className="mt-2 list-inside list-disc text-xs text-gray-600">
                                {mesa.fiscales.map((nombre, fiscalIndex) => (
                                  <li
                                    key={`${mesa.id}-fiscal-${fiscalIndex}`}
                                    className="font-medium text-gray-800"
                                  >
                                    {nombre}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-gray-600">
                {mesasModalState?.noGroupsMessage ?? mesasModalState?.emptyMessage ??
                  'No hay mesas registradas.'}
              </p>
            )}
          </div>
        </IonContent>
      </IonModal>

      <IonModal
        isOpen={showPhotoModal}
        onDidDismiss={handleCloseModal}
        backdropDismiss={!isSendingPhoto}
      >
        <IonContent className="ion-padding">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Confirmar envío de foto</h2>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Datos del establecimiento</p>
              <div className="space-y-1 rounded-lg bg-gray-100 p-3 text-sm text-gray-700">
                {establecimientoForm.nombre && (
                  <p>
                    <span className="font-medium text-gray-800">Nombre:</span>{' '}
                    {establecimientoForm.nombre}
                  </p>
                )}
                {establecimientoForm.seccion && (
                  <p>
                    <span className="font-medium text-gray-800">Sección:</span>{' '}
                    {establecimientoForm.seccion}
                  </p>
                )}
                {establecimientoForm.circuito && (
                  <p>
                    <span className="font-medium text-gray-800">Circuito:</span>{' '}
                    {establecimientoForm.circuito}
                  </p>
                )}
                {!establecimientoForm.nombre &&
                  !establecimientoForm.seccion &&
                  !establecimientoForm.circuito && (
                    <p>No hay datos adicionales guardados.</p>
                  )}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-600">Seleccioná la mesa antes de enviar</p>
              {mesaOptions.length > 0 && (
                <IonItem lines="full" style={itemStyle}>
                  <IonLabel position="stacked" style={labelStyle}>
                    Mesas asignadas
                  </IonLabel>
                  <IonSelect
                    value={mesaSelectValue}
                    interface="popover"
                    placeholder="Elegí una mesa"
                    onIonChange={(e) => handleMesaSelectChange(e.detail.value)}
                  >
                    {mesaOptions.map((mesa) => (
                      <IonSelectOption key={mesa} value={mesa}>
                        {mesa}
                      </IonSelectOption>
                    ))}
                    <IonSelectOption value="__custom__">Otra mesa...</IonSelectOption>
                  </IonSelect>
                </IonItem>
              )}
              {(useCustomMesa || mesaOptions.length === 0) && (
                <IonItem lines="full" style={itemStyle}>
                  <IonLabel position="stacked" style={labelStyle}>
                    Número de mesa
                  </IonLabel>
                  <Input
                    value={establecimientoForm.mesa}
                    inputmode="numeric"
                    onIonChange={(e) => handleMesaInputChange(e.detail.value ?? '')}
                    placeholder="Ingresa el número de mesa"
                  />
                </IonItem>
              )}
            </div>
            {sendError && <p className="text-sm text-red-600">{sendError}</p>}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button color="medium" fill="outline" onClick={handleCloseModal} disabled={isSendingPhoto}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmModal} disabled={isSendingPhoto}>
                {isSendingPhoto ? 'Enviando...' : 'Confirmar envío'}
              </Button>
            </div>
          </div>
        </IonContent>
      </IonModal>
    </Layout>
  );
};

export default FiscalizacionActions;
