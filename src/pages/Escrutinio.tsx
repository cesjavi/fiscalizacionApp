import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  IonContent,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonText,
  IonNote,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
} from '@ionic/react';
import { Button, Input } from '../components';
import Layout from '../components/Layout';
import { useHistory } from 'react-router-dom';
import {
  getFiscalAssignmentDetails,
  getMemberNameParts,
  useFiscalData,
} from '../FiscalDataContext';
import type { FiscalData } from '../FiscalDataContext';
import { buildUrl, postJson } from '../utils/api';

interface Lista {
  id: string;
  lista: string;
  sigla?: string;
  numeroLista?: string;
}
// helper común arriba del componente (o en utils)
function toErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  try { return JSON.stringify(e); } catch { return String(e); }
}


const readStoredString = (
  keys: string[],
  preferredNestedKeys: readonly string[] = [],
): string | undefined => {
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
        const record = parsed as Record<string, unknown>;
        for (const nestedKey of preferredNestedKeys) {
          const value = record[nestedKey];
          if (typeof value === 'string' && value.trim()) {
            return value.trim();
          }
        }

        for (const value of Object.values(record)) {
          if (typeof value === 'string' && value.trim()) {
            return value.trim();
          }
        }
      }
    } catch {
      // not JSON, fall back below
    }

    if (trimmed) return trimmed;
  }

  return undefined;
};

const CAMPOS_ESPECIALES = ['BLANCO', 'RECURRIDOS', 'NULO', 'IMPUGNADO'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getTrimmedString = (value: unknown): string | undefined => {
  if (typeof value === 'string' || typeof value === 'number') {
    const text = `${value}`.trim();
    if (text) return text;
  }
  return undefined;
};

const getFirstString = (
  record: Record<string, unknown>,
  keys: readonly string[],
  visited: Set<unknown> = new Set(),
): string | undefined => {
  for (const key of keys) {
    if (!(key in record)) continue;
    const value = record[key];
    const direct = getTrimmedString(value);
    if (direct) return direct;
    if (value && typeof value === 'object' && !visited.has(value)) {
      visited.add(value);
      if (isRecord(value)) {
        const nested = getFirstString(value, keys, visited);
        if (nested) return nested;
      }
    }
  }
  return undefined;
};

const findFirstStringDeep = (
  value: unknown,
  keys: readonly string[],
  visited: Set<unknown> = new Set(),
): string | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  if (visited.has(value)) {
    return undefined;
  }

  visited.add(value);

  if (isRecord(value)) {
    const direct = getFirstString(value, keys, visited);
    if (direct) {
      return direct;
    }

    for (const child of Object.values(value)) {
      const found = findFirstStringDeep(child, keys, visited);
      if (found) {
        return found;
      }
    }
  } else if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstStringDeep(item, keys, visited);
      if (found) {
        return found;
      }
    }
  }

  return undefined;
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

const SECCION_KEYS = ['seccion', 'numero_seccion', 'seccionNumero', 'seccion_nro'] as const;
const CIRCUITO_KEYS = ['circuito', 'numero_circuito', 'circuitoNumero', 'circuito_nro'] as const;
const ESTABLECIMIENTO_NAME_KEYS = [
  'nombre_establecimiento',
  'nombreEstablecimiento',
  'nombre_establecimiento_fiscalizacion',
  'nombre',
  'establecimiento',
  'lugar',
] as const;
const ESTABLECIMIENTO_DIRECCION_KEYS = [
  'direccion_establecimiento',
  'direccionEstablecimiento',
  'direccion_establecimiento_fiscalizacion',
  'direccion',
  'domicilio',
  'ubicacion',
] as const;

type MesaOption = {
  value: string;
  label: string;
  seccion?: string;
  circuito?: string;
  establecimientoNombre?: string;
  establecimientoDireccion?: string;
};

type EscrutinioItem = {
  identificador: string;
  nomenclatura: string;
  nombre: string;
  cantidad: number;
};

const ESPECIALES_DETALLE: Record<typeof CAMPOS_ESPECIALES[number], Omit<EscrutinioItem, 'cantidad'>> = {
  BLANCO: {
    identificador: 'BLANCO',
    nomenclatura: 'BLANCO',
    nombre: 'Voto en blanco',
  },
  IMPUGNADO: {
    identificador: 'IMPUGNADO',
    nomenclatura: 'IMPUGNADO',
    nombre: 'Votos de Identidad Impugnada',
  },
  NULO: {
    identificador: 'NULO',
    nomenclatura: 'NULO',
    nombre: 'Votos nulos',
  },
  RECURRIDOS: {
    identificador: 'RECURRIDOS',
    nomenclatura: 'RECURRIDOS',
    nombre: 'Votos recurridos',
  },
};

const TOTAL_ITEM: Omit<EscrutinioItem, 'cantidad'> = {
  identificador: 'TOTAL',
  nomenclatura: 'TOTAL',
  nombre: 'Votos General',
};

// ===== Componente =====
const Escrutinio: React.FC = () => {
  const history = useHistory();
  const { hasFiscalData, setFiscalData, fiscalData } = useFiscalData();

  const assignmentDetails = useMemo(
    () => getFiscalAssignmentDetails(fiscalData ?? undefined),
    [fiscalData],
  );

  const [listas, setListas] = useState<Lista[]>([]);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fallbackSeccion = useMemo(
    () => findFirstStringDeep(fiscalData, SECCION_KEYS),
    [fiscalData],
  );

  const fallbackCircuito = useMemo(
    () => findFirstStringDeep(fiscalData, CIRCUITO_KEYS),
    [fiscalData],
  );

  const mesaDetailsList = useMemo(() => {
    type PartialMesaOption = Partial<Omit<MesaOption, 'value' | 'label'>>;

    const map = new Map<string, MesaOption>();

    const mergeMesaOption = (value: string, incoming: PartialMesaOption = {}) => {
      if (!value) return;
      const existing = map.get(value);
      const next: MesaOption = {
        value,
        label: `Mesa ${value}`,
        seccion: existing?.seccion ?? incoming.seccion,
        circuito: existing?.circuito ?? incoming.circuito,
        establecimientoNombre:
          existing?.establecimientoNombre ?? incoming.establecimientoNombre,
        establecimientoDireccion:
          existing?.establecimientoDireccion ?? incoming.establecimientoDireccion,
      };
      map.set(value, next);
    };

    const addMesaValue = (value: unknown, meta: PartialMesaOption = {}) => {
      const normalized = getTrimmedString(value);
      if (!normalized) return;
      mergeMesaOption(normalized, meta);
    };

    const addMesaRecord = (
      mesaValue: unknown,
      meta: PartialMesaOption = {},
    ) => {
      if (!mesaValue) return;
      if (typeof mesaValue === 'string' || typeof mesaValue === 'number') {
        addMesaValue(mesaValue, meta);
        return;
      }

      if (!isRecord(mesaValue)) return;

      const baseMeta: PartialMesaOption = { ...meta };
      baseMeta.seccion = baseMeta.seccion ?? getFirstString(mesaValue, SECCION_KEYS);
      baseMeta.circuito =
        baseMeta.circuito ?? getFirstString(mesaValue, CIRCUITO_KEYS);

      if (!baseMeta.establecimientoNombre || !baseMeta.establecimientoDireccion) {
        const nestedEstablecimiento = mesaValue['establecimiento'];
        if (isRecord(nestedEstablecimiento)) {
          baseMeta.establecimientoNombre =
            baseMeta.establecimientoNombre ??
            getFirstString(nestedEstablecimiento, ESTABLECIMIENTO_NAME_KEYS);
          baseMeta.establecimientoDireccion =
            baseMeta.establecimientoDireccion ??
            getFirstString(
              nestedEstablecimiento,
              ESTABLECIMIENTO_DIRECCION_KEYS,
            );
        }
      }

      baseMeta.establecimientoNombre =
        baseMeta.establecimientoNombre ??
        getFirstString(mesaValue, ESTABLECIMIENTO_NAME_KEYS);
      baseMeta.establecimientoDireccion =
        baseMeta.establecimientoDireccion ??
        getFirstString(mesaValue, ESTABLECIMIENTO_DIRECCION_KEYS);

      const numero = getFirstString(mesaValue, MESA_KEYS);
      if (numero) {
        mergeMesaOption(numero, baseMeta);
      }
    };

    const addFromArray = (value: unknown, meta: PartialMesaOption = {}) => {
      if (!Array.isArray(value)) return;
      value.forEach((item) => addMesaRecord(item, meta));
    };

    const establecimientoMeta: PartialMesaOption = {
      establecimientoNombre: assignmentDetails.establecimiento || undefined,
      establecimientoDireccion: assignmentDetails.direccion || undefined,
      seccion: fallbackSeccion,
      circuito: fallbackCircuito,
    };

    addMesaValue(assignmentDetails.mesa, establecimientoMeta);

    const record = fiscalData as Record<string, unknown> | null | undefined;
    if (record) {
      addMesaValue(getFirstString(record, MESA_KEYS), establecimientoMeta);

      const fgAsignado = record['f_g_asignado'];
      if (isRecord(fgAsignado)) {
        const meta: PartialMesaOption = {
          establecimientoNombre:
            getFirstString(fgAsignado, ESTABLECIMIENTO_NAME_KEYS) ||
            establecimientoMeta.establecimientoNombre,
          establecimientoDireccion:
            getFirstString(fgAsignado, ESTABLECIMIENTO_DIRECCION_KEYS) ||
            establecimientoMeta.establecimientoDireccion,
        };
        addFromArray(fgAsignado['mesas'], meta);
      }

      const fgAsignadoArray = record['fg_asignado'];
      if (Array.isArray(fgAsignadoArray)) {
        fgAsignadoArray.forEach((item) => {
          if (!isRecord(item)) return;
          const meta: PartialMesaOption = {
            establecimientoNombre:
              getFirstString(item, ESTABLECIMIENTO_NAME_KEYS) ||
              establecimientoMeta.establecimientoNombre,
            establecimientoDireccion:
              getFirstString(item, ESTABLECIMIENTO_DIRECCION_KEYS) ||
              establecimientoMeta.establecimientoDireccion,
          };
          addFromArray(item['mesas'], meta);
        });
      }

      const establecimiento = record['establecimiento_fiscalizacion'];
      if (isRecord(establecimiento)) {
        const meta: PartialMesaOption = {
          establecimientoNombre:
            getFirstString(establecimiento, ESTABLECIMIENTO_NAME_KEYS) ||
            establecimientoMeta.establecimientoNombre,
          establecimientoDireccion:
            getFirstString(establecimiento, ESTABLECIMIENTO_DIRECCION_KEYS) ||
            establecimientoMeta.establecimientoDireccion,
          seccion: getFirstString(establecimiento, SECCION_KEYS),
          circuito: getFirstString(establecimiento, CIRCUITO_KEYS),
        };
        addFromArray(establecimiento['mesas'], meta);
      }
    }

    if (typeof window !== 'undefined') {
      addMesaValue(localStorage.getItem('mesa_nro'), establecimientoMeta);
      addMesaValue(localStorage.getItem('mesaId'), establecimientoMeta);
    }

    return Array.from(map.values()).sort((a, b) =>
      a.value.localeCompare(b.value, undefined, { numeric: true }),
    );
  }, [
    assignmentDetails.direccion,
    assignmentDetails.establecimiento,
    assignmentDetails.mesa,
    fallbackCircuito,
    fallbackSeccion,
    fiscalData,
  ]);

  const mesaOptions = useMemo(
    () => mesaDetailsList.map((detail) => detail.value),
    [mesaDetailsList],
  );

  const mesaDetailsMap = useMemo(() => {
    const map = new Map<string, MesaOption>();
    mesaDetailsList.forEach((detail) => {
      map.set(detail.value, detail);
    });
    return map;
  }, [mesaDetailsList]);

  const [mesaSeleccionada, setMesaSeleccionada] = useState(() => {
    if (typeof window !== 'undefined') {
      const storedMesa = localStorage.getItem('mesa_nro')?.trim();
      if (storedMesa) return storedMesa;
      const storedMesaId = localStorage.getItem('mesaId')?.trim();
      if (storedMesaId) return storedMesaId;
    }
    const mesa = assignmentDetails.mesa;
    if (mesa !== undefined && mesa !== null) {
      const trimmed = `${mesa}`.trim();
      if (trimmed) return trimmed;
    }
    return '';
  });
  const [usarMesaPersonalizada, setUsarMesaPersonalizada] = useState(false);

  useEffect(() => {
    if (mesaOptions.length === 0) {
      setUsarMesaPersonalizada(true);
      return;
    }
    if (!mesaSeleccionada) {
      return;
    }
    setUsarMesaPersonalizada(!mesaOptions.includes(mesaSeleccionada));
  }, [mesaOptions, mesaSeleccionada]);

  useEffect(() => {
    if (!mesaSeleccionada && mesaOptions.length > 0 && !usarMesaPersonalizada) {
      setMesaSeleccionada(mesaOptions[0]);
    }
  }, [mesaOptions, mesaSeleccionada, usarMesaPersonalizada]);

  const mesaSelectValue = usarMesaPersonalizada ? '__custom__' : mesaSeleccionada;

  const handleMesaSelectChange = useCallback((value: string | null | undefined) => {
    if (value === '__custom__') {
      setUsarMesaPersonalizada(true);
      setMesaSeleccionada('');
      return;
    }
    const formatted = value ? `${value}`.trim() : '';
    setUsarMesaPersonalizada(false);
    setMesaSeleccionada(formatted);
  }, []);

  const handleMesaInputChange = useCallback((value: string) => {
    setMesaSeleccionada(value);
  }, []);

  const selectedMesaDetail = useMemo(() => {
    const key = mesaSeleccionada.trim();
    if (!key) return undefined;
    return mesaDetailsMap.get(key);
  }, [mesaDetailsMap, mesaSeleccionada]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const detail = selectedMesaDetail;
    if (!detail) return;
    if (detail.seccion) {
      localStorage.setItem('seccion', detail.seccion);
    }
    if (detail.circuito) {
      localStorage.setItem('circuito', detail.circuito);
    }
    if (detail.establecimientoNombre) {
      localStorage.setItem('nombre_establecimiento', detail.establecimientoNombre);
      localStorage.setItem('establecimiento', detail.establecimientoNombre);
      localStorage.setItem('establecimiento_fiscalizacion', detail.establecimientoNombre);
    }
    if (detail.establecimientoDireccion) {
      localStorage.setItem('direccion_establecimiento', detail.establecimientoDireccion);
      localStorage.setItem(
        'direccion_establecimiento_fiscalizacion',
        detail.establecimientoDireccion,
      );
    }
  }, [selectedMesaDetail]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (fallbackSeccion && !localStorage.getItem('seccion')) {
      localStorage.setItem('seccion', fallbackSeccion);
    }
    if (fallbackCircuito && !localStorage.getItem('circuito')) {
      localStorage.setItem('circuito', fallbackCircuito);
    }
  }, [fallbackCircuito, fallbackSeccion]);

  const puedeEnviar = mesaSeleccionada.trim().length > 0;

  // Cargar listas al iniciar (requiere token)
  useEffect(() => {
    // Garantizar fiscalData
    if (!hasFiscalData) {
      const stored = localStorage.getItem('fiscalData');
      if (stored) {
        try {
          setFiscalData(JSON.parse(stored) as FiscalData);
        } catch {
          history.replace('/fiscalizacion-lookup');
          return;
        }
      } else {
        history.replace('/fiscalizacion-lookup');
        return;
      }
    }

    type ApiLista = {
      identificador: string | number;
      nombre?: string | null;
      nomenclatura?: string | null;
      [key: string]: unknown;
    };

    const normalizeText = (value: unknown): string | undefined => {
      if (value === null || value === undefined) return undefined;
      const text = `${value}`.trim();
      return text || undefined;
    };

    const extractListNumber = (item: ApiLista): string | undefined => {
      const record = item as Record<string, unknown>;
      const candidateKeys = [
        'numero_lista',
        'numeroLista',
        'numero',
        'lista_numero',
        'listaNumero',
        'nro_lista',
        'listNumber',
        'lista',
      ];

      for (const key of candidateKeys) {
        if (!(key in record)) continue;
        const normalized = normalizeText(record[key]);
        if (normalized && /\d/.test(normalized)) {
          return normalized;
        }
      }

      const idText = normalizeText(item.identificador);
      if (idText && /\d/.test(idText)) {
        return idText;
      }

      const nameText = normalizeText(item.nombre);
      if (nameText) {
        const match = nameText.match(/\b\d+[A-Z]?\b/);
        if (match) {
          return match[0];
        }
      }

      return undefined;
    };

    const fetchListas = async () => {
      setError(null);
      const token = localStorage.getItem('token') || '';
      if (!token) {
        history.replace('/fiscalizacion-lookup');
        return;
      }

      try {
        // 1) Intento con Bearer
        let r = await postJson<{ data: ApiLista[] }>(
          '/api/candidatos/listarCandidatos',
          {},
          { Authorization: `${token}` }
        );

        // 2) Si 401, reintento con token pelado (como en buscarFiscal)
        if (!r.ok && r.status === 401) {
          r = await postJson<{ data: ApiLista[] }>(
            '/api/candidatos/listarCandidatos',
            {},
            { Authorization: token }
          );
        }

        if (!r.ok) {
          const msg = typeof r.payload === 'string'
            ? r.payload
            : (r.payload as { message?: string })?.message || `HTTP ${r.status}`;
          throw new Error(msg);
        }

        const data = (r.payload as { data?: ApiLista[] }).data ?? [];
        const mapped: Lista[] = data.map((listaItem) => {
          const id = normalizeText(listaItem.identificador) ?? `${listaItem.identificador}`;
          const listaNombre = normalizeText(listaItem.nombre) ?? id;
          const sigla = normalizeText(listaItem.nomenclatura);
          const numeroLista = extractListNumber(listaItem);

          return {
            id,
            lista: listaNombre,
            sigla,
            numeroLista,
          };
        });
        setListas(mapped);
      } catch (e: unknown) {
        const msg = toErrorMessage(e);
        console.error('[escrutinio] submit error:', e);
        setError(msg || 'Error al guardar escrutinio');
        alert('[escrutinio]');
      }
    };

    fetchListas();
  }, [hasFiscalData, history, setFiscalData]);

  // Handlers
  const handleChange = (id: string, value: string) => {
    setValores((prev) => ({ ...prev, [id]: value }));
  };
const Gap: React.FC<{ h?: number }> = ({ h = 8 }) => <div style={{ height: h }} />;
  const handleSubmit = async () => {
    setError(null);

    // Construir objeto de resultados
    const datos: Record<string, number> = {};
    const escrutinioItems: EscrutinioItem[] = [];

    listas.forEach((l) => {
      const cantidad = Number.parseInt(valores[l.id] || '0', 10) || 0;
      datos[l.lista] = cantidad;
      escrutinioItems.push({
        identificador: l.id,
        nomenclatura: l.sigla ?? l.numeroLista ?? l.id,
        nombre: l.lista,
        cantidad,
      });
    });

    CAMPOS_ESPECIALES.forEach((key) => {
      const cantidad = Number.parseInt(valores[key] || '0', 10) || 0;
      datos[key] = cantidad;
      escrutinioItems.push({
        ...ESPECIALES_DETALLE[key],
        cantidad,
      });
    });

    const total = escrutinioItems.reduce((acc, item) => acc + item.cantidad, 0);
    datos['TOTAL'] = total;
    escrutinioItems.push({
      ...TOTAL_ITEM,
      cantidad: total,
    });

    setResultado(datos);

    const mesaSeleccionadaNormalizada = mesaSeleccionada.trim();
    if (!mesaSeleccionadaNormalizada) {
      setError('Debes seleccionar una mesa antes de enviar el escrutinio.');
      return;
    }

    localStorage.setItem('mesaId', mesaSeleccionadaNormalizada);
    localStorage.setItem('mesa_nro', mesaSeleccionadaNormalizada);
    localStorage.setItem('mesa', mesaSeleccionadaNormalizada);

    const mesaIdNumero = Number.parseInt(mesaSeleccionadaNormalizada, 10);
    const mesaParaPayload = Number.isNaN(mesaIdNumero)
      ? mesaSeleccionadaNormalizada
      : mesaIdNumero;

    //const foto = localStorage.getItem('fotoActa');
    const seccion =
      selectedMesaDetail?.seccion ||
      readStoredString(['seccion', 'numero_seccion', 'seccionNumero', 'seccion_nro']) ||
      fallbackSeccion ||
      '';
    console.log('seccion', seccion);
    const circuito =
      selectedMesaDetail?.circuito ||
      readStoredString([
        'circuito',
        'numero_circuito',
        'circuitoNumero',
        'circuito_nro',
      ]) ||
      fallbackCircuito ||
      '';

    const { establecimiento: establecimientoNombre, direccion: establecimientoDireccion } =
      assignmentDetails;

    const establecimientoNombreFinal =
      selectedMesaDetail?.establecimientoNombre ||
      establecimientoNombre ||
      readStoredString(
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
      ) ||
      '';

    const direccionNombreFinal =
      selectedMesaDetail?.establecimientoDireccion ||
      establecimientoDireccion ||
      readStoredString(
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
        ],
        ['direccion', 'domicilio', 'ubicacion', 'address', 'calle'],
      ) ||
      ([seccion ? `Sección ${seccion}` : null, circuito ? `Circuito ${circuito}` : null]
        .filter(Boolean)
        .join(' · ') ||
        '');

    const { apellidos, nombres, displayName } = getMemberNameParts(
      fiscalData ?? undefined,
    );

    const personaRaw = (fiscalData as Record<string, unknown> | null)?.persona as
      | Record<string, unknown>
      | string
      | undefined;
    console.log('personaRaw from fiscalData:', personaRaw);
    console.log('fiscalData:', fiscalData);
    const personaDni = String(fiscalData?.dni_miembro);
    console.log('dniCandidate from personaRaw:', personaDni)   
    let personaEmail = (() => {
      if (!personaRaw || typeof personaRaw === 'string') return undefined;
      const emailCandidate =
        personaRaw['email'] || personaRaw['correo'] || personaRaw['correo_electronico'];
      return typeof emailCandidate === 'string' ? emailCandidate.trim() || undefined : undefined;
    })();

    if (!personaEmail) {
      personaEmail = readStoredString(['email', 'correo', 'correo_electronico']) || undefined;
    }

    const token = localStorage.getItem('token') || '';
    if (!token) {
      history.replace('/fiscalizacion-lookup');
      return;
    }

    const payload: Record<string, unknown> = {
      establecimiento: {
        seccion,
        circuito,
        mesa: mesaParaPayload,        
        nombre: establecimientoNombreFinal,
        direccion: direccionNombreFinal,
      },
      persona: {
        dni: personaDni ?? null,
        nombre: nombres || displayName || '',
        apellido: apellidos || '',
        email: personaEmail || '',
      },
      escrutinio: escrutinioItems,
      fechaEnviado: new Date().toISOString(),
    };
    console.log(payload);
    //if (foto) {
      //payload['foto'] = foto;
    //}

    try {
      console.log('Submitting escrutinio payload:', payload); 
      const res = await fetch(buildUrl('/api/actas/crear'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: token,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status} + ${res.statusText}`);
      }
      console.log('res', res);
      alert('Escrutinio enviado correctamente');
      localStorage.removeItem('fotoActa');
    } catch (e: unknown) {
      const msg = toErrorMessage(e);
      console.error('[escrutinio] submit error:', e);
      setError(msg || 'Error al guardar escrutinio');
      //alert('Error al guardar escrutinio');
    }
  };

  return (
    <Layout backHref="/fiscalizacion-acciones">
      <IonContent>
        {error && <p className="text-4xl text-red-600 ion-ion-margin-start">{error}</p>}

        {/* Mesa */}
        <IonItem className="form-field">
          <IonLabel position="stacked" className="text-gray-700 font-semibold">
            Mesa
          </IonLabel>
          {mesaOptions.length > 0 && (
            <>
              <IonSelect
                interface="popover"
                placeholder="Seleccioná una mesa"
                value={mesaSelectValue}
                onIonChange={(event) => handleMesaSelectChange(event.detail.value)}
              >
                {mesaDetailsList.map((detail) => {
                  const metadata: string[] = [];
                  if (detail.seccion) {
                    metadata.push(`Sec. ${detail.seccion}`);
                  }
                  if (detail.circuito) {
                    metadata.push(`Circ. ${detail.circuito}`);
                  }
                  const suffix = metadata.length > 0 ? ` · ${metadata.join(' · ')}` : '';
                  return (
                    <IonSelectOption key={detail.value} value={detail.value}>
                      {detail.label}
                      {suffix}
                    </IonSelectOption>
                  );
                })}
                <IonSelectOption value="__custom__">Otra mesa…</IonSelectOption>
              </IonSelect>
              <IonNote color="medium" className="mt-2 block text-sm">
                Elegí la mesa asignada o seleccioná “Otra mesa…” para escribirla manualmente.
              </IonNote>
            </>
          )}
          {(usarMesaPersonalizada || mesaOptions.length === 0) && (
            <div className="mt-2 w-full">
              <Input
                value={mesaSeleccionada}
                inputmode="numeric"
                onIonChange={(e) => handleMesaInputChange(e.detail.value ?? '')}
                placeholder="Número de mesa"
              />
            </div>
          )}
          {selectedMesaDetail && (
            <div className="mt-3 space-y-1 text-sm text-gray-600">
              {selectedMesaDetail.seccion && (
                <IonText className="block">
                  Sección:{' '}
                  <span className="font-medium text-gray-800">
                    {selectedMesaDetail.seccion}
                  </span>
                </IonText>
              )}
              {selectedMesaDetail.circuito && (
                <IonText className="block">
                  Circuito:{' '}
                  <span className="font-medium text-gray-800">
                    {selectedMesaDetail.circuito}
                  </span>
                </IonText>
              )}
              {selectedMesaDetail.establecimientoNombre && (
                <IonText className="block">
                  Establecimiento:{' '}
                  <span className="font-medium text-gray-800">
                    {selectedMesaDetail.establecimientoNombre}
                  </span>
                </IonText>
              )}
              {selectedMesaDetail.establecimientoDireccion && (
                <IonText className="block">
                  Dirección:{' '}
                  <span className="font-medium text-gray-800">
                    {selectedMesaDetail.establecimientoDireccion}
                  </span>
                </IonText>
              )}
            </div>
          )}
        </IonItem>

        {/* Cards por lista */}
        {listas.map((l) => (
  <IonCard
    key={l.id}
    className="text-20xl ion-margin-bottom shadow-sm border border-solid border-gray-200"
  >
    <IonCardHeader className="pb-0">
      {/* Cabecera con nombre a la izquierda y número a la derecha */}
      <div className="text-1xl flex items-start justify-between items-center">
        <div>
          <IonCardTitle className="text-xl font-semibold text-gray-900 leading-tight">
            {l.numeroLista} - {l.lista}
          </IonCardTitle>
          {l.sigla && (
            <IonNote
              color="medium"
              className="mt-1 block text-sm text-gray-600 uppercase tracking-wide"
            >
              {l.sigla}
            </IonNote>
          )}
        </div>

      </div>
    </IonCardHeader>

    <IonCardContent className="pt-4">
      <IonItem lines="none" className="form-field ion-no-padding">
        <Input
          type="number"
          value={valores[l.id] || ''}
          onIonChange={(e) => handleChange(l.id, e.detail.value ?? '')}
          placeholder="Cantidad de votos"
          aria-label={`Cantidad de votos para ${l.lista}`}
        />
      </IonItem>
    </IonCardContent>
  </IonCard>
))}


        {/* Campos especiales: se dejan igual */}
        {CAMPOS_ESPECIALES.map((key) => (
          <IonItem key={key} className="form-field">
            <IonLabel position="stacked" className="text-gray-700 font-semibold">
              {ESPECIALES_DETALLE[key].nombre}
            </IonLabel>
            <div style={{ height: 6 }} />
            <Input
              type="number"
              value={valores[key] || ''}
              onIonChange={(e) => handleChange(key, e.detail.value ?? '')}
              placeholder={`Cantidad - ${ESPECIALES_DETALLE[key].nombre}`}
            />
          </IonItem>
        ))}

        <Button
          expand="block"
          className="ion-margin-top"
          onClick={handleSubmit}
          disabled={!puedeEnviar}
        >
          Enviar
        </Button>
        <div style={{ height: 24 }} />
      </IonContent>
    </Layout>
  );
};

export default Escrutinio;
