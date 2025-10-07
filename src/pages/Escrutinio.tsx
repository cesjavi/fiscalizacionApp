import React, { useState, useEffect } from 'react';
import { IonContent, IonItem, IonLabel, IonText } from '@ionic/react';
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
  nro_lista?: string;
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
  const { hasFiscalData, setFiscalData } = useFiscalData();

  const [listas, setListas] = useState<Lista[]>([]);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    type ApiLista = { identificador: string; nombre: string; nomenclatura: string };

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
        const mapped: Lista[] = data.map(({ identificador, nombre, nomenclatura }) => ({
          id: identificador,
          lista: nombre,
          nro_lista: nomenclatura,
        }));
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
        nomenclatura: l.nro_lista ?? l.id,
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

    const mesaIdRaw = localStorage.getItem('mesaId');
    const mesaIdNumber = mesaIdRaw !== null ? Number(mesaIdRaw) : undefined;
    const mesaId =
      typeof mesaIdNumber === 'number' && Number.isFinite(mesaIdNumber) ? mesaIdNumber : undefined;
    const foto = localStorage.getItem('fotoActa');
    const seccion = localStorage.getItem('seccion')?.trim() || '';
    const circuito = localStorage.getItem('circuito')?.trim() || '';
    const mesaStored = localStorage.getItem('mesa')?.trim() || '';
    const mesaNumero = mesaStored || (typeof mesaId === 'number' ? String(mesaId) : '');

    const { establecimiento: establecimientoNombre, direccion: establecimientoDireccion } =
      getFiscalAssignmentDetails(fiscalData ?? undefined);

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

    let personaDni = (() => {
      if (!personaRaw) return undefined;
      if (typeof personaRaw === 'string') {
        const match = personaRaw.match(/\d+/);
        return match ? Number(match[0]) : undefined;
      }
      const dniCandidate = personaRaw['dni'] ?? personaRaw['documento'] ?? personaRaw['dni_miembro'];
      if (typeof dniCandidate === 'number') return dniCandidate;
      if (typeof dniCandidate === 'string') {
        const trimmed = dniCandidate.trim();
        if (!trimmed) return undefined;
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : undefined;
      }
      return undefined;
    })();

    if (personaDni === undefined) {
      const storedDni = readStoredString(['dni_miembro', 'dni', 'documento']);
      if (storedDni) {
        const parsed = Number(storedDni);
        if (Number.isFinite(parsed)) {
          personaDni = parsed;
        }
      }
    }

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
        mesa: (() => {
          if (!mesaNumero) return undefined;
          const parsed = Number(mesaNumero);
          return Number.isFinite(parsed) ? parsed : mesaNumero;
        })(),
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

    if (foto) {
      payload['foto'] = foto;
    }

    try {
      const res = await fetch(buildUrl('/crear'), {
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
        throw new Error(text || `HTTP ${res.status}`);
      }

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
      <IonContent className="ion-padding">
        {error && <p className="text-red-600 ion-margin-bottom">{error}</p>}

        {/* Inputs para todas las listas */}
        {listas.map((l) => (
          <IonItem key={l.id}>
            <IonLabel position="stacked">
              {l.nro_lista ? `${l.nro_lista} - ${l.lista}` : l.lista}
            </IonLabel>
            <Input
              type="number"
              value={valores[l.id] || ''}
              onIonChange={(e) => handleChange(l.id, e.detail.value ?? '')}
              placeholder="Cantidad de votos"
            />
          </IonItem>
        ))}

        {/* Inputs para campos especiales */}
        {CAMPOS_ESPECIALES.map((key) => (
          <IonItem key={key}>
            <IonLabel position="stacked">{ESPECIALES_DETALLE[key].nombre}</IonLabel>
            <Input
              type="number"
              value={valores[key] || ''}
              onIonChange={(e) => handleChange(key, e.detail.value ?? '')}
              placeholder={`Cantidad - ${ESPECIALES_DETALLE[key].nombre}`}
            />
          </IonItem>
        ))}

        <Button expand="block" className="ion-margin-top" onClick={handleSubmit}>
          Enviar
        </Button>

        {resultado && (
          <IonText className="ion-margin-top">
            <pre>{JSON.stringify(resultado, null, 2)}</pre>
          </IonText>
        )}
      </IonContent>
    </Layout>
  );
};

export default Escrutinio;
