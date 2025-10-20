import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export interface FiscalData {
  apellidos_miembro?: string | null;
  nombres_miembro?: string | null;
  nombre_tipo_miembro?: string | null;
  tipo_fiscal?: string | null;
  nombre_zona?: string | null;
  zonaEleccion?: unknown;
  persona?: unknown;
  mesa_nro?: string | null;
  [key: string]: unknown;
}

interface MemberNameParts {
  apellidos?: string;
  nombres?: string;
  displayName?: string;
}

const formatMemberNameParts = (parts: MemberNameParts): string | undefined => {
  const { displayName, apellidos, nombres } = parts;

  if (displayName && displayName.trim().length > 0) {
    return displayName.trim();
  }

  const apellidosTrimmed = apellidos?.trim();
  const nombresTrimmed = nombres?.trim();

  if (apellidosTrimmed || nombresTrimmed) {
    return `${apellidosTrimmed ?? ''}${
      apellidosTrimmed && nombresTrimmed ? ', ' : ''
    }${nombresTrimmed ?? ''}`.trim();
  }

  return undefined;
};

const getTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const NAME_FIELD_KEYS = [
  'apellidos_miembro',
  'apellidos',
  'apellido',
  'nombres_miembro',
  'nombres',
  'nombre',
  'apellido_miembro',
  'nombre_miembro',
];

const METADATA_FIELD_KEYS = ['nombre_tipo_miembro', 'tipo_fiscal', 'nombre_zona', 'zona'];
const FISCAL_GENERAL_FIELD_KEYS = [
  'fiscal_general',
  'nombre_fiscal_general',
  'fiscalGeneral',
  'fiscal_general_nombre',
  'fg_asignado',
] as const;
const MESA_FIELD_KEYS = [
  'mesa',
  'mesa_asignada',
  'mesa_id',
  'numero_mesa',
  'mesa_numero',
  'mesaNumero',
  'mesa_nro',
] as const;
const ESTABLECIMIENTO_FIELD_KEYS = [
  'nombre_establecimiento',
  'nombre_establecimiento_educativo',
  'nombre_establecimiento_fiscalizacion',
  'nombre_escuela',
  'nombreEscuela',
  'escuela',
  'establecimiento',
  'establecimiento_fiscalizacion',
  'nombre_lugar',
  'lugar',
] as const;
const DIRECCION_FIELD_KEYS = [
  'direccion_establecimiento',
  'direccion_establecimiento_educativo',
  'direccion_establecimiento_fiscalizacion',
  'direccion_escuela',
  'direccionEscuela',
  'direccion',
  'domicilio',
  'ubicacion',
  'establecimiento_fiscalizacion',
  'direccion_lugar',
] as const;
const LUGAR_FIELD_KEYS = [
  'lugar',
  'lugar_fiscalizacion',
  'nombre_lugar',
  'ubicacion',
] as const;
const NESTED_STRING_KEYS = [
  'nombre',
  'name',
  'descripcion',
  'description',
  'direccion',
  'ubicacion',
  'lugar',
] as const;

const extractStringValue = (
  value: unknown,
  preferredNestedKeys?: readonly string[],
): string | undefined => {
  const direct = getTrimmedString(value);
  if (direct) return direct;

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = extractStringValue(item, preferredNestedKeys);
      if (nested) return nested;
    }
    return undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const nameFromValue = formatMemberNameParts(
    getMemberNameParts(value as Record<string, unknown> & { persona?: unknown }),
  );
  if (nameFromValue) {
    return nameFromValue;
  }

  if ('persona' in value) {
    const personaName = formatMemberNameParts(deriveNamesFromPersona(value['persona']));
    if (personaName) {
      return personaName;
    }
  }

  if (preferredNestedKeys) {
    for (const key of preferredNestedKeys) {
      if (key in value) {
        const nested = extractStringValue(value[key], preferredNestedKeys);
        if (nested) return nested;
      }
    }
  }

  for (const key of NESTED_STRING_KEYS) {
    if (key in value) {
      const nested = extractStringValue(value[key], preferredNestedKeys);
      if (nested) return nested;
    }
  }

  for (const nested of Object.values(value)) {
    const nestedValue = extractStringValue(nested, preferredNestedKeys);
    if (nestedValue) return nestedValue;
  }

  return undefined;
};

const getFirstMatchingField = (
  source: Record<string, unknown>,
  keys: readonly string[],
  preferredNestedKeys?: readonly string[],
): string | undefined => {
  for (const key of keys) {
    if (key in source) {
      const value = extractStringValue(source[key], preferredNestedKeys);
      if (value) {
        return value;
      }
    }
  }
  return undefined;
};

const findNestedPersona = (value: unknown): Record<string, unknown> | undefined => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNestedPersona(item);
      if (found) return found;
    }
    return undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  if ('persona' in value && isRecord(value['persona'])) {
    return value['persona'] as Record<string, unknown>;
  }

  for (const nested of Object.values(value)) {
    const found = findNestedPersona(nested);
    if (found) return found;
  }

  return undefined;
};

const hasNameFields = (record: Record<string, unknown>): boolean => {
  return NAME_FIELD_KEYS.some((key) => {
    const value = record[key];
    return typeof value === 'string' && value.trim().length > 0;
  });
};

const findNameSource = (value: unknown): Record<string, unknown> | undefined => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNameSource(item);
      if (found) return found;
    }
    return undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  if (hasNameFields(value)) {
    return value;
  }

  for (const nested of Object.values(value)) {
    const found = findNameSource(nested);
    if (found) return found;
  }

  return undefined;
};

const deriveNamesFromPersona = (persona: unknown): MemberNameParts => {
  if (!persona) return {};

  if (typeof persona === 'string') {
    const trimmed = persona.trim();
    if (!trimmed) return {};

    const commaParts = trimmed.split(',');
    if (commaParts.length >= 2) {
      const apellidos = commaParts[0]?.trim();
      const nombres = commaParts.slice(1).join(',').trim();
      return {
        apellidos: apellidos || undefined,
        nombres: nombres || undefined,
        displayName: trimmed,
      };
    }

    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      const apellidos = parts.slice(-1).join(' ').trim();
      const nombres = parts.slice(0, -1).join(' ').trim();
      return {
        apellidos: apellidos || undefined,
        nombres: nombres || undefined,
        displayName: trimmed,
      };
    }

    return { apellidos: trimmed, displayName: trimmed };
  }

  if (typeof persona === 'object') {
    const personaObj = persona as Record<string, unknown>;
    const apellidos =
      getTrimmedString(personaObj['apellidos_miembro']) ||
      getTrimmedString(personaObj['apellidos']) ||
      getTrimmedString(personaObj['apellido']);
    const nombres =
      getTrimmedString(personaObj['nombres_miembro']) ||
      getTrimmedString(personaObj['nombres']) ||
      getTrimmedString(personaObj['nombre']);

    const displayName =
      getTrimmedString(personaObj['nombre_completo']) ||
      [nombres, apellidos].filter(Boolean).join(' ').trim() ||
      undefined;

    return {
      apellidos: apellidos || undefined,
      nombres: nombres || undefined,
      displayName,
    };
  }

  return {};
};

export const getMemberNameParts = (
  data?: FiscalData | (Record<string, unknown> & { persona?: unknown }) | null,
): MemberNameParts => {
  if (!data) return {};

  const record = data as Record<string, unknown> & { persona?: unknown };
  const apellidos = getTrimmedString(record['apellidos_miembro']);
  const nombres = getTrimmedString(record['nombres_miembro']);

  if (apellidos && nombres) {
    return { apellidos, nombres, displayName: `${apellidos} ${nombres}`.trim() };
  }

  const legacy = deriveNamesFromPersona(record.persona);

  return {
    apellidos: apellidos || legacy.apellidos,
    nombres: nombres || legacy.nombres,
    displayName:
      (apellidos && nombres && `${apellidos} ${nombres}`.trim()) ||
      legacy.displayName ||
      [legacy.apellidos, legacy.nombres].filter(Boolean).join(' ').trim() ||
      undefined,
  };
};

export const normalizeFiscalData = (value: unknown): FiscalData | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const normalized: Record<string, unknown> = { ...raw };

  const nestedPersona = findNestedPersona(raw);
  if (nestedPersona) {
    normalized['persona'] = nestedPersona;
  }

  const nameSource = findNameSource(raw);
  if (nameSource) {
    for (const key of [...NAME_FIELD_KEYS, ...METADATA_FIELD_KEYS]) {
      if (normalized[key] === undefined && key in nameSource) {
        normalized[key] = nameSource[key];
      }
    }
  }

  const { apellidos, nombres } = getMemberNameParts(
    normalized as Record<string, unknown> & { persona?: unknown },
  );

  if (apellidos) {
    normalized['apellidos_miembro'] = apellidos;
  }

  if (nombres) {
    normalized['nombres_miembro'] = nombres;
  }

  const tipo =
    getTrimmedString(normalized['nombre_tipo_miembro']) ||
    getTrimmedString(normalized['tipo_fiscal']);

  if (tipo) {
    normalized['nombre_tipo_miembro'] = tipo;
  }

  const zona =
    getTrimmedString(normalized['nombre_zona']) || getTrimmedString(normalized['zona']);

  if (zona) {
    normalized['nombre_zona'] = zona;
  }

  return normalized as FiscalData;
};
// En FiscalDataContext.ts

//import type { FiscalData } from "./FiscalDataContext";

// Extendemos lo que ya tenés con los campos que llegan del API
// ---- mapeo desde API real ----
type FiscalDataAPI = FiscalData & {
  mesa?: string | number;
  mesa_nro?: string | number;                     // <— nuevo
  fg_asignado?: Array<{ nombre?: string }>;       // <— nuevo (array)
  f_g_asignado?: { nombre?: string };             // por si viniera así en otras respuestas
  establecimiento_fiscalizacion?: { direccion?: string };
  nombre?: string;                                // <— nombre a nivel raíz (escuela)
  nombre_establecimiento?: string;
  establecimiento?: string;
  lugar?: string;
  direccion_establecimiento?: string;
  direccion?: string;
};

const asStr = (v: unknown): string | undefined =>
  typeof v === "string" ? (v.trim() || undefined) : undefined;
/*
export function getFiscalAssignmentDetails(fd?: FiscalData): {
  mesa?: string;
  lugar?: string;
  establecimiento?: string;
  direccion?: string;
  fiscalGeneral?: string;
} {
  const data = fd as FiscalDataAPI | undefined;
  if (!data) return {};

  // Mesa: mesa | mesa_nro | primera de fg_asignado.mesas (si existiera)
  let mesa: string | undefined;
  const mesaRaw =
    (typeof data.mesa === "number" || typeof data.mesa === "string") ? data.mesa :
    (typeof data.mesa_nro === "number" || typeof data.mesa_nro === "string") ? data.mesa_nro :
    undefined;
  if (mesaRaw !== undefined) {
    const s = String(mesaRaw).trim();
    mesa = s || undefined;
  }

  // Establecimiento: fg_asignado[0].nombre | f_g_asignado.nombre | nombre (root) | otros
  const establecimiento =
    asStr(data.fg_asignado?.[0]?.nombre) ??
    asStr(data.f_g_asignado?.nombre) ??
    asStr(data.nombre) ??
    asStr(data.nombre_establecimiento) ??
    asStr(data.establecimiento) ??
    asStr(data.lugar);

  // Dirección: establecimiento_fiscalizacion.direccion | otras variantes
  const direccion =
    asStr(data.establecimiento_fiscalizacion?.direccion) ??
    asStr(data.direccion_establecimiento) ??
    asStr(data.direccion);

  // Para la UI actual, usamos el mismo valor
  const lugar = establecimiento;

  // (opcional) “fiscalGeneral”: si querés mostrarlo
  const fiscalGeneral =
    asStr(data.fg_asignado?.[0]?.nombre) ?? asStr(data.f_g_asignado?.nombre);

  return { mesa, lugar, establecimiento, direccion, fiscalGeneral };
}
*/

/*
export const getFiscalAssignmentDetails = (
  data?: FiscalData | null,
): {
  mesa?: string;
  lugar?: string;
  establecimiento?: string;
  direccion?: string;
  fiscalGeneral?: string;
} => {
  if (!data) {
    return {};
  }

  const record = data as Record<string, unknown>;

  const establecimiento = getFirstMatchingField(
    record,
    ESTABLECIMIENTO_FIELD_KEYS,
    ['nombre', 'name', 'descripcion', 'description', 'lugar'],
  );

  const direccion =
    getFirstMatchingField(record, DIRECCION_FIELD_KEYS, [
      'direccion',
      'domicilio',
      'ubicacion',
      'address',
      'calle',
    ]) ||
    (typeof record['establecimiento'] === 'object' &&
    record['establecimiento'] !== null &&
    !Array.isArray(record['establecimiento'])
      ? getFirstMatchingField(record['establecimiento'] as Record<string, unknown>, ['direccion', 'domicilio', 'ubicacion'], [
          'direccion',
          'domicilio',
          'ubicacion',
          'address',
          'calle',
        ])
      : undefined);

  return {
    mesa: getFirstMatchingField(record, MESA_FIELD_KEYS),
    lugar: getFirstMatchingField(record, LUGAR_FIELD_KEYS),
    establecimiento,
    direccion,
    fiscalGeneral: getFirstMatchingField(record, FISCAL_GENERAL_FIELD_KEYS),
  };
};*/

export const getFiscalAssignmentDetails = (
  data?: FiscalData | null,
): {
  mesa?: string;
  lugar?: string;
  establecimiento?: string;
  direccion?: string;
  fiscalGeneral?: string;
} => {
  if (!data) {
    return {};
  }
  
  const record = data as Record<string, unknown>;
  /*const mesa = getFirstMatchingField(
    record,
    MESA_FIELD_KEYS ,
    ['mesa_nro'],
  );
  */
 const mesa = data.mesa_nro ?? '';
  console.log('mesa ' + data.mesa_nro);
  const establecimiento = getFirstMatchingField(
    record,
    ESTABLECIMIENTO_FIELD_KEYS,
    ['nombre', 'name', 'descripcion', 'description', 'lugar'],
  );

  const direccion =
    getFirstMatchingField(record, DIRECCION_FIELD_KEYS, [
      'direccion',
      'domicilio',
      'ubicacion',
      'address',
      'calle',
    ]) ||
    (typeof record['establecimiento'] === 'object' &&
    record['establecimiento'] !== null &&
    !Array.isArray(record['establecimiento'])
      ? getFirstMatchingField(record['establecimiento'] as Record<string, unknown>, ['direccion', 'domicilio', 'ubicacion'], [
          'direccion',
          'domicilio',
          'ubicacion',
          'address',
          'calle',
        ])
      : undefined);

  return {
    mesa ,//getFirstMatchingField(record, 'mesa_nro' in record ? ['mesa_nro'] : MESA_FIELD_KEYS),
    lugar: getFirstMatchingField(record, LUGAR_FIELD_KEYS),
    establecimiento,
    direccion,
    fiscalGeneral: getFirstMatchingField(record, FISCAL_GENERAL_FIELD_KEYS),
  };
};

interface FiscalDataContextValue {
  fiscalData: FiscalData | null;
  setFiscalData: React.Dispatch<React.SetStateAction<FiscalData | null>>;
  hasFiscalData: boolean;
}

const FiscalDataContext = createContext<FiscalDataContextValue | undefined>(
  undefined,
);

export const FiscalDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const initialValue = useMemo(() => {
    try {
      const stored = localStorage.getItem('fiscalData');
      if (!stored) return null;
      return normalizeFiscalData(JSON.parse(stored));
    } catch (error) {
      console.warn('Failed to parse stored fiscal data', error);
      return null;
    }
  }, []);

  const [fiscalData, setFiscalDataState] = useState<FiscalData | null>(
    initialValue,
  );

  const setFiscalData = useCallback(
    (value: React.SetStateAction<FiscalData | null>) => {
      setFiscalDataState((prev) => {
        const nextValue =
          typeof value === 'function' ? (value as (arg: FiscalData | null) => FiscalData | null)(prev) : value;

        if (nextValue === null) {
          return null;
        }

        return normalizeFiscalData(nextValue) ?? null;
      });
    },
    [],
  );

  useEffect(() => {
    if (fiscalData === null) {
      localStorage.removeItem('fiscalData');
    } else {
      localStorage.setItem('fiscalData', JSON.stringify(fiscalData));
    }
  }, [fiscalData]);

  const value: FiscalDataContextValue = {
    fiscalData,
    setFiscalData,
    hasFiscalData: fiscalData !== null,
  };

  return (
    <FiscalDataContext.Provider value={value}>
      {children}
    </FiscalDataContext.Provider>
  );
};

export const useFiscalData = (): FiscalDataContextValue => {
  const ctx = useContext(FiscalDataContext);
  if (!ctx) {
    throw new Error('useFiscalData must be used within a FiscalDataProvider');
  }
  return ctx;
};

export default FiscalDataContext;
