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
  nombre_zona?: string | null;
  persona?: unknown;
  [key: string]: unknown;
}

interface MemberNameParts {
  apellidos?: string;
  nombres?: string;
  displayName?: string;
}

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
