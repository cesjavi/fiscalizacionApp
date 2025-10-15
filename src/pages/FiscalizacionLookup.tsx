import React, { useRef, useState } from 'react';
import { IonContent, IonItem, IonLabel, useIonViewWillEnter } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button, Input } from '../components';
import { normalizeFiscalData, useFiscalData } from '../FiscalDataContext';
import type { FiscalData } from '../FiscalDataContext';

// ================== Configuración de API ==================
const API_BASE = (import.meta.env.VITE_API_BASE || '')
  .replace(/\/api\/?$/, '')
  .replace(/\/$/, '');

// Paths SIEMPRE con /api/...
const LOGIN_PATHS = ['/api/auth/login'] as const;
const BUSCAR_FISCAL_PATH = '/api/fiscalizacion/buscarFiscal';

// helper para extraer el objeto real del fiscal
function extractFiscalData(payload: unknown): unknown {
  type PayloadType = { payload?: { data?: unknown }; data?: unknown };
  const p = payload as PayloadType;
  return p?.payload?.data ?? p?.data ?? payload;
}

// ================== Helper de fetch ==================
async function postJson(
  path: string,
  body: unknown,
  headers: Record<string, string> = {}
) {
  const url = path.startsWith('http')
    ? path
    : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: JSON.stringify(body),
  });

  const ct = resp.headers.get('content-type') || '';
  const payload = ct.includes('application/json') ? await resp.json() : await resp.text();
  return { ok: resp.ok, status: resp.status, payload } as const;
}

// ================== Login ==================
async function loginAndGetToken(usuario: string, password: string): Promise<string> {
  if (!usuario || !password) throw new Error('Usuario y contraseña son obligatorios');
  let lastErr = 'Login no disponible';

  for (const path of LOGIN_PATHS) {
    const r = await postJson(path, { usuario, password });
    if (r.ok) {
      const payload = r.payload as { token?: unknown };
      if (typeof payload.token === 'string') return payload.token;
    }
    lastErr =
      typeof r.payload === 'string'
        ? r.payload
        : (r.payload as { message?: string })?.message || `${r.status} Error`;
  }
  throw new Error(lastErr || 'No se pudo iniciar sesión');
}

// ================== Componente ==================
const FiscalizacionLookup: React.FC = () => {
  const usuario = import.meta.env.VITE_FISCALIZACION_USER as string;
  const password = import.meta.env.VITE_FISCALIZACION_PASS as string;

  const [dni, setDni] = useState('');
  const [result, setResult] = useState<FiscalData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const history = useHistory();
  const { setFiscalData } = useFiscalData();

  useIonViewWillEnter(() => {
    setDni('');
    setError(null);
    setResult(null);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    try {
      // Leer el valor más reciente directamente del input (evita lag de setState)
      const el = document.getElementById('dni-input') as HTMLInputElement | null;
      const dniValue = (el?.value ?? dni ?? '').toString().trim();

      if (!dniValue) throw new Error('DNI inválido');
      const dniNum = Number(dniValue);
      if (Number.isNaN(dniNum)) throw new Error('DNI inválido');

      // 1) LOGIN -> token
      const token = await loginAndGetToken(usuario, password);
      localStorage.setItem('token', token);

      // 2) BUSCAR FISCAL
      const r = await postJson(
        BUSCAR_FISCAL_PATH,
        { dni_miembro: dniNum },
        { Authorization: `Bearer ${token}` }
      );

      console.log('[FiscalizacionLookup] buscarFiscal response', {
        status: r.status,
        ok: r.ok,
        payload: r.payload,
      });

      // si el backend acepta token "pelado", reintentar
      if (!r.ok && r.status === 401) {
        const retry = await postJson(
          BUSCAR_FISCAL_PATH,
          { dni_miembro: dniNum },
          { Authorization: token }
        );

        console.log('[FiscalizacionLookup] buscarFiscal retry response', {
          status: retry.status,
          ok: retry.ok,
          payload: retry.payload,
        });
        if (!retry.ok) {
          const msg =
            typeof retry.payload === 'string'
              ? retry.payload
              : (retry.payload as { message?: string })?.message || 'No autorizado';
          throw new Error(msg);
        }
        const fiscalRaw = extractFiscalData(retry.payload);
        const normalizedFiscal = normalizeFiscalData(fiscalRaw) ?? (fiscalRaw as FiscalData);
        setResult(normalizedFiscal);
        localStorage.setItem('fiscalData', JSON.stringify(normalizedFiscal));
        setFiscalData(normalizedFiscal);
        history.push('/fiscalizacion-acciones', { fiscalData: normalizedFiscal });
        return;
      }

      if (!r.ok) {
        const msg =
          typeof r.payload === 'string'
            ? r.payload
            : (r.payload as { message?: string })?.message || 'DNI no registrado';
        throw new Error(msg);
      }

      // OK
      const fiscalRaw = extractFiscalData(r.payload);
      const normalizedFiscal = normalizeFiscalData(fiscalRaw) ?? (fiscalRaw as FiscalData);
      setResult(normalizedFiscal);
      localStorage.setItem('fiscalData', JSON.stringify(normalizedFiscal));
      setFiscalData(normalizedFiscal);
      history.push('/fiscalizacion-acciones', { fiscalData: normalizedFiscal });

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'DNI no registrado';
      setError(msg);
    }
  };

  return (
    <Layout backHref="/login">
      <IonContent className="ion-padding">
        <form ref={formRef} onSubmit={handleSubmit}>
          <IonItem className="form-field">
            <IonLabel position="stacked" className="text-gray-700 font-semibold mt-2">
              DNI del miembro
            </IonLabel>
            <div style={{ height: 8 }} />
            <Input
              className="mt-2"
              id="dni-input"
              value={dni}
              inputMode="numeric"
              enterKeyHint="done"
              onIonChange={(e) => setDni(e.detail.value!)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  // Dispara el submit nativo del form con el valor actual del input
                  formRef.current?.requestSubmit();
                }
              }}
              required
            />
          </IonItem>

          <Button expand="block" type="submit" className="ion-margin-top">
            Buscar
          </Button>
        </form>

        {error && <p className="text-red-600 ion-margin-top">{error}</p>}

        {result !== null}
      </IonContent>
    </Layout>
  );
};

export default FiscalizacionLookup;
