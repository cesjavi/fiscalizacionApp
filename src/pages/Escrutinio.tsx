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

  const mesaOptions = useMemo(() => {
    const values = new Set<string>();
    const addValue = (value: unknown) => {
      if (value === null || value === undefined) return;
      const trimmed = `${value}`.trim();
      if (trimmed) values.add(trimmed);
    };

    addValue(assignmentDetails.mesa);

    const record = fiscalData as
      | ({
          f_g_asignado?: { mesas?: Array<{ numero?: string | number }> };
          establecimiento_fiscalizacion?: { mesas?: Array<{ numero?: string | number }> } | null;
        } &
          Record<string, unknown>)
      | null
      | undefined;
    const mesas = record?.f_g_asignado?.mesas;
    if (Array.isArray(mesas)) {
      mesas.forEach((mesa) => addValue(mesa?.numero));
    }

    const establecimiento = record?.establecimiento_fiscalizacion;
    if (establecimiento && typeof establecimiento === 'object' && !Array.isArray(establecimiento)) {
      const mesasEstablecimiento = establecimiento.mesas;
      if (Array.isArray(mesasEstablecimiento)) {
        mesasEstablecimiento.forEach((mesa) => addValue(mesa?.numero));
      }
    }

    if (typeof window !== 'undefined') {
      addValue(localStorage.getItem('mesa_nro'));
      addValue(localStorage.getItem('mesaId'));
    }

    return Array.from(values).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [assignmentDetails.mesa, fiscalData]);

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
    const seccion = localStorage.getItem('seccion')?.trim() || '';
    console.log('seccion', seccion);  
    const circuito = localStorage.getItem('circuito')?.trim() || '';
    
    const { establecimiento: establecimientoNombre, direccion: establecimientoDireccion } =
      assignmentDetails;

    const establecimientoNombreFinal =
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
        {error && <p className="text-red-600 ion-ion-margin-start">{error}</p>}

        {/* Mesa */}
        <IonItem className="form-field">
          <IonLabel position="stacked" className="text-gray-700 font-semibold">
            Mesa
          </IonLabel>
          {/* ...select/inputs de mesa iguales... */}
        </IonItem>

        {/* Cards por lista */}
        {listas.map((l) => (
  <IonCard
    key={l.id}
    className="ion-margin-bottom shadow-sm border border-solid border-gray-200"
  >
    <IonCardHeader className="pb-0">
      {/* Cabecera con nombre a la izquierda y número a la derecha */}
      <div className="flex items-start justify-between items-center">
        <div>
          <IonCardTitle className="text-xl font-semibold text-gray-900 leading-tight">
            {l.lista}
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

        {l.numeroLista && (
          <div className="text-3xl font-bold text-gray-900 bg-gray-100 rounded-xl px-4 py-2 ml-3 shadow-sm">
            {l.numeroLista}
          </div>
        )}
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
