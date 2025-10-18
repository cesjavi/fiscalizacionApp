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
import { Camera, CameraResultType } from '@capacitor/camera';
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

type EstablecimientoCard = {
  id: string;
  nombre?: string;
  direccion?: string;
  mapsQuery?: string;
  fiscalGeneral?: string;
  telefono?: string;
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

const extractPhone = (record: Record<string, unknown>): string | undefined => {
  for (const key of PHONE_KEYS) {
    if (key in record) {
      const value = asString(record[key]);
      if (value) return value;
    }
  }

  const personaValue = record['persona'];
  if (isRecord(personaValue)) {
    const nested = extractPhone(personaValue);
    if (nested) return nested;
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

const isLikelyPhone = (value: string): boolean => {
  const digits = value.replace(/[^+\d]/g, '');
  return digits.length >= 6 && /\d/.test(digits);
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
      if (phone) {
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

  if ('mesa_asignada' in record && isRecord(record['mesa_asignada'])) {
    const nested = extractMesaNumero(record['mesa_asignada'], visited);
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

  return {
    nombre,
    direccion,
    mapsQuery: mapsQuery || undefined,
    fiscalGeneral,
    telefono,
  };
};

const ESTABLECIMIENTOS_KEYS = [
  'establecimientos',
  'establecimientos_asignados',
  'establecimientosAsignados',
  'establecimientos_fiscalizacion',
  'escuelas',
  'escuelas_asignadas',
  'escuelasAsignadas',
  'colegios',
  'lugares',
  'lugaresFiscalizacion',
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

  const fiscalesMesa = useMemo(() => extractFiscalesDeMesa(fiscalData ?? undefined), [fiscalData]);
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
  const [showEstablecimientos, setShowEstablecimientos] = useState(false);

  const fechaEnvio = new Date().toISOString();
  const fileDescriptor = 'archivo subido (acta.jpg)';

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
    if (typeof window === 'undefined') return undefined;
    const storedMesa = localStorage.getItem('mesa_nro');
    return storedMesa?.trim() ? storedMesa.trim() : undefined;
  }, [mesaAsignadaDesdeData]);

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
    if (!value) return undefined;
    const normalized = value.replace(/[^+\d]/g, '').trim();
    return normalized ? `tel:${normalized}` : undefined;
  }, []);

  // Tomar foto con Camera -> Blob real + preview
  const handleFoto = async () => {
    const platform = Capacitor.getPlatform();
    if (platform === 'web') {
      fileInputRef.current?.click();
      return;
    }

    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri, // URI -> podemos fetchear el Blob real
        quality: 80,
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
    if (fiscalesMesa.length === 0 && showFiscalesMesa) {
      setShowFiscalesMesa(false);
    }
  }, [fiscalesMesa.length, showFiscalesMesa]);

  useEffect(() => {
    if (establecimientosAsignados.length === 0 && showEstablecimientos) {
      setShowEstablecimientos(false);
    }
  }, [establecimientosAsignados.length, showEstablecimientos]);

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
              <h2 className="font-semibold text-base">Fiscal asignado</h2>
              {memberName && <p className="text-sm">{memberName}</p>}
              {memberType && (
                <p className={metadataLabelClass}>
                  Tipo de fiscal: <span className={metadataValueClass}>{memberType}</span>
                </p>
              )}
              {mesaAsignada && (
                <p className={metadataLabelClass}>
                  Mesa: <span className={metadataValueClass}>{mesaAsignada}</span>
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

        {(fiscalGeneralContact || fiscalZonalContact) && (
          <div className="ion-margin-bottom flex flex-col gap-3">
            {fiscalGeneralContact && (
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

            {fiscalZonalContact && (
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

        {coords && (
          <IonItem lines="none" className="ion-margin-bottom rounded-lg overflow-hidden">
            <IonLabel>
              <p className="text-sm text-gray-600 mb-2">Mapa del establecimiento</p>
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
              {mapsQuery && (
                <a
                  className="text-sm text-blue-600 underline mt-2 inline-block"
                  href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir en Google Maps
                </a>
              )}
            </IonLabel>
          </IonItem>
        )}

        <div className="flex flex-col items-center gap-4 w-4/5 mx-auto mt-4">
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

          {isFiscalGeneral && fiscalesMesa.length > 0 && (
            <div className="flex w-full flex-col items-center gap-3">
              <Button
                className="flex flex-col items-center w-4/5"
                onClick={() => setShowFiscalesMesa((prev) => !prev)}
              >
                {showFiscalesMesa ? 'Ocultar fiscales de mesa' : 'Fiscales de mesa'}
              </Button>
              {showFiscalesMesa && (
                <div className="flex w-full flex-col gap-3">
                  {fiscalesMesa.map((fiscal) => {
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
                                <span className="font-medium text-gray-800">{fiscal.mesa}</span>
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
                  })}
                </div>
              )}
            </div>
          )}

          {isFiscalZonal && establecimientosAsignados.length > 0 && (
            <div className="flex w-full flex-col items-center gap-3">
              <Button
                className="flex flex-col items-center w-4/5"
                onClick={() => setShowEstablecimientos((prev) => !prev)}
              >
                {showEstablecimientos ? 'Ocultar establecimientos' : 'Establecimientos'}
              </Button>
              {showEstablecimientos && (
                <div className="flex w-full flex-col gap-3">
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
                                  <a
                                    href={telHref}
                                    className="font-medium text-blue-600 underline"
                                  >
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
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </IonContent>

      <IonModal
        isOpen={showPhotoModal}
        onDidDismiss={handleCloseModal}
        backdropDismiss={!isSendingPhoto}
      >
        <IonContent className="ion-padding">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Confirmar envío de foto</h2>
            <div>
              <p className="text-sm text-gray-600">Archivo</p>
              <p className="text-base text-gray-800 font-medium">{fileDescriptor}</p>
            </div>

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
