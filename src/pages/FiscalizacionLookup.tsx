import React, { useState } from 'react';
import { IonContent, IonItem, IonLabel, useIonViewWillEnter } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button, Input } from '../components';
import { useFiscalData } from '../FiscalDataContext';

// ================== Configuración de API ==================
// En desarrollo (Vite) dejá VITE_API_BASE = '' y usá proxy.
// En producción (Vercel), seteá VITE_API_BASE = https://TU-BACKEND.com (¡sin barra final!)
const API_BASE = import.meta.env.VITE_API_BASE || ''; 

// Paths SIEMPRE con /api/... (tu backend los expone así)
const LOGIN_PATHS = ['/api/auth/login'] as const;
const BUSCAR_FISCAL_PATH = '/api/fiscalizacion/buscarFiscal';

// ================== Helper de fetch ==================
async function postJson(
  path: string,
  body: unknown,
  headers: Record<string, string> = {}
) {
  // arma URL: absoluta en prod (API_BASE) o relativa en dev (proxy)
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
  // creds desde env (no hardcodear)
  const usuario = import.meta.env.VITE_FISCALIZACION_USER as string;
  const password = import.meta.env.VITE_FISCALIZACION_PASS as string;

  const [dni, setDni] = useState('');
  const [result, setResult] = useState<unknown | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      // 1) LOGIN -> token
      const token = await loginAndGetToken(usuario, password);
      localStorage.setItem('token', token);

      // 2) BUSCAR FISCAL con Authorization
      const dniNum = Number((dni ?? '').toString().trim());
      if (Number.isNaN(dniNum)) throw new Error('DNI inválido');

      const r = await postJson(
        BUSCAR_FISCAL_PATH,
        { dni_miembro: dniNum },
        { Authorization: `Bearer ${token}` }
      );

      // si el backend acepta token "pelado", reintentar
      if (!r.ok && r.status === 401) {
        const retry = await postJson(
          BUSCAR_FISCAL_PATH,
          { dni_miembro: dniNum },
          { Authorization: token }
        );
        if (!retry.ok) {
          const msg =
            typeof retry.payload === 'string'
              ? retry.payload
              : (retry.payload as { message?: string })?.message || 'No autorizado';
          throw new Error(msg);
        }
        setResult(retry.payload);
        localStorage.setItem('fiscalData', JSON.stringify(retry.payload));
        setFiscalData(retry.payload);
        history.push('/fiscalizacion-acciones', { fiscalData: retry.payload });
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
      setResult(r.payload);
      localStorage.setItem('fiscalData', JSON.stringify(r.payload));
      setFiscalData(r.payload);
      history.push('/fiscalizacion-acciones', { fiscalData: r.payload });

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'DNI no registrado';
      setError(msg);
    }
  };

  return (
    <Layout backHref="/login">
      <IonContent className="ion-padding">
        <form onSubmit={handleSubmit}>
          <IonItem>
            <IonLabel position="stacked">DNI del miembro</IonLabel>
            <Input
              value={dni}
              onIonChange={(e) => setDni(e.detail.value!)}
              required
            />
          </IonItem>

          <Button expand="block" type="submit" className="ion-margin-top">
            Buscar
          </Button>
        </form>

        {error && <p className="text-red-600 ion-margin-top">{error}</p>}

        {result !== null && (
          <pre className="ion-margin-top whitespace-pre-wrap">
            {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
          </pre>
        )}
      </IonContent>
    </Layout>
  );
};

export default FiscalizacionLookup;
