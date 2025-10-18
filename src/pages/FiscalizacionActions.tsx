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

const PHONE_KEYS = [
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

const extractEstablecimientos = (data: unknown): EstablecimientoCardData[] => {
  if (!data || typeof data !== 'object') return [];
  const results: EstablecimientoCardData[] = [];
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
        const nombre = resolveEstablecimientoName(obj);
        const direccion = resolveDireccionValue(obj);
        const locationUrl = extractLocationUrlFromRecord(obj);
        const fiscalGeneralInfo = extractFiscalGeneralInfo(obj);
        const hasIndicator = ESTABLISHMENT_INDICATOR_KEYS.some((key) => key in obj);

        if (
          nombre &&
          (direccion || locationUrl || hasIndicator || fiscalGeneralInfo?.nombre)
        ) {
          const key = `${nombre}|${direccion ?? ''}|${locationUrl ?? ''}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push({
              id: key || `establecimiento-${results.length}`,
              nombre,
              direccion: direccion ?? undefined,
              locationUrl: locationUrl ?? undefined,
              fiscalGeneral: fiscalGeneralInfo?.nombre,
              fiscalGeneralTelefono: fiscalGeneralInfo?.telefono,
            });
          }
        }
      }

      Object.values(obj).forEach((child) => traverse(child, false));
    }
  };

  traverse(data, true);
  return results.sort((a, b) => a.nombre.localeCompare(b.nombre, undefined, { numeric: true }));
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

  const memberTypeNormalized = useMemo(
    () => (memberType ? memberType.trim().toUpperCase() : ''),
    [memberType],
  );

  const isFiscalZonal = memberTypeNormalized === 'FISCAL ZONAL';
  const isFiscalGeneral = memberTypeNormalized === 'FISCAL GENERAL';

  const mesaFiscales = useMemo(
    () => extractMesaFiscales(fiscalData ?? undefined),
    [fiscalData],
  );

  const establecimientosZonales = useMemo(
    () => extractEstablecimientos(fiscalData ?? undefined),
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
  const [showMesaFiscales, setShowMesaFiscales] = useState(false);
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
    fiscalGeneral,
  } = useMemo(() => getFiscalAssignmentDetails(fiscalData ?? undefined), [fiscalData]);
  console.log('Detalles de asignación fiscal:', {
    mesa: mesaAsignadaDesdeData,
    lugar: lugarAsignadoDesdeData,
    establecimiento: establecimientoDesdeData,
    direccion: direccionDesdeData,    
  }); 
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
    console.log('Payload para envío de foto:', fd);
    try {
      setIsSendingPhoto(true);
      setSendError(null);

      const raw = localStorage.getItem('token') || '';
      console.log('Token para auth:', raw);
   
      
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
    if (!isFiscalGeneral) {
      setShowMesaFiscales(false);
    }
  }, [isFiscalGeneral]);

  useEffect(() => {
    if (!isFiscalZonal) {
      setShowEstablecimientos(false);
    }
  }, [isFiscalZonal]);

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

        {isFiscalGeneral && (
          <div className="w-full max-w-3xl mx-auto mb-6">
            <Button
              expand="block"
              onClick={() => setShowMesaFiscales((prev) => !prev)}
            >
              {showMesaFiscales ? 'Ocultar fiscales de mesa' : 'Fiscales de mesa'}
            </Button>
            {showMesaFiscales && (
              <div className="mt-3 space-y-3">
                {mesaFiscales.length > 0 ? (
                  mesaFiscales.map((fiscal) => {
                    const telHref = fiscal.telefono ? buildTelHref(fiscal.telefono) : undefined;
                    return (
                      <div
                        key={fiscal.id}
                        className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-base font-semibold text-gray-900">{fiscal.nombre}</h3>
                          <span className="text-sm font-semibold text-indigo-600">
                            Mesa {fiscal.mesa}
                          </span>
                        </div>
                        {fiscal.esMesaTestigo && (
                          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-red-600">
                            MESA TESTIGO
                          </p>
                        )}
                        {fiscal.telefono && (
                          <p className="mt-2 text-sm text-gray-700">
                            Teléfono:{' '}
                            {telHref ? (
                              <a className="text-blue-600 underline" href={telHref}>
                                {fiscal.telefono}
                              </a>
                            ) : (
                              <span className="font-medium text-gray-900">{fiscal.telefono}</span>
                            )}
                          </p>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="mt-3 text-sm text-center text-gray-600">
                    No se encontraron fiscales de mesa asignados.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {isFiscalZonal && (
          <div className="w-full max-w-3xl mx-auto mb-6">
            <Button
              expand="block"
              onClick={() => setShowEstablecimientos((prev) => !prev)}
            >
              {showEstablecimientos ? 'Ocultar establecimientos' : 'Establecimientos'}
            </Button>
            {showEstablecimientos && (
              <div className="mt-3 space-y-4">
                {establecimientosZonales.length > 0 ? (
                  establecimientosZonales.map((establecimiento) => {
                    const telHref = establecimiento.fiscalGeneralTelefono
                      ? buildTelHref(establecimiento.fiscalGeneralTelefono)
                      : undefined;
                    return (
                      <div
                        key={establecimiento.id}
                        className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-base font-semibold text-gray-900">
                            {establecimiento.nombre}
                          </h3>
                          {establecimiento.locationUrl && (
                            <a
                              className="text-sm text-blue-600 underline"
                              href={establecimiento.locationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Ver ubicación
                            </a>
                          )}
                        </div>
                        {establecimiento.direccion && (
                          <p className="mt-2 text-sm text-gray-700">
                            Dirección:{' '}
                            <span className="font-medium text-gray-900">
                              {establecimiento.direccion}
                            </span>
                          </p>
                        )}
                        {(establecimiento.fiscalGeneral ||
                          establecimiento.fiscalGeneralTelefono) && (
                          <div className="mt-3 rounded-md bg-gray-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Fiscal General
                            </p>
                            {establecimiento.fiscalGeneral && (
                              <p className="mt-1 text-sm text-gray-900">
                                {establecimiento.fiscalGeneral}
                              </p>
                            )}
                            {establecimiento.fiscalGeneralTelefono && (
                              <p className="mt-1 text-sm text-gray-700">
                                Teléfono:{' '}
                                {telHref ? (
                                  <a className="text-blue-600 underline" href={telHref}>
                                    {establecimiento.fiscalGeneralTelefono}
                                  </a>
                                ) : (
                                  <span className="font-medium text-gray-900">
                                    {establecimiento.fiscalGeneralTelefono}
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="mt-3 text-sm text-center text-gray-600">
                    No se encontraron establecimientos asignados.
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

        <div className="flex flex-col items-center gap-4  w-4/5 mx-auto mt-4">
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
