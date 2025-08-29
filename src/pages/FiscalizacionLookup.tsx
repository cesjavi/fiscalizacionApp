import React, { useState } from 'react';
import { IonContent, IonItem, IonLabel, useIonViewWillEnter } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button, Input } from '../components';

type ApiOk<T = unknown> = { ok: true; status: number; payload: T };
type ApiFail = { ok: false; status: number; payload: unknown };
type ApiResp<T = unknown> = ApiOk<T> | ApiFail;

const LOGIN_PATHS = ['/api/users/login', '/api/auth/login'] as const;
const BUSCAR_FISCAL_PATH = '/api/fiscalizacion/buscarFiscal';

async function postJson(
  path: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<ApiResp> {
  const resp = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });

  const ct = resp.headers.get('content-type') || '';
  const payload = ct.includes('application/json')
    ? await resp.json()
    : await resp.text();

  return { ok: resp.ok, status: resp.status, payload };
}

async function loginAndGetToken(usuario: string, password: string): Promise<string> {
  let lastErr = 'Login no disponible';
  for (const path of LOGIN_PATHS) {
    const r = await postJson(path, { usuario, password });
    if (r.ok) {
      const payload = r.payload as { token?: unknown };
      if (typeof payload.token === 'string') {
        return payload.token;
      }
    }
    lastErr =
      typeof r.payload === 'string'
        ? r.payload
        : (r.payload as { message?: string }).message || `${r.status} Error`;
  }
  throw new Error(lastErr || 'No se pudo iniciar sesión');
}

const FiscalizacionLookup: React.FC = () => {
  const usuario = import.meta.env.VITE_FISCALIZACION_USER as string;
  const password = import.meta.env.VITE_FISCALIZACION_PASS as string;
  const [dni, setDni] = useState('');
  const [result, setResult] = useState<unknown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const history = useHistory();

  useIonViewWillEnter(() => {
    setDni('');
    // Opcional: limpiar errores/resultados previos
    // setError(null);
    // setResult(null);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    try {
      // 1) LOGIN -> token
      const token = await loginAndGetToken(usuario, password);
      localStorage.setItem('token', token);
      console.log('Token guardado en localStorage', token);

      // 2) BUSCAR FISCAL (primero Authorization: <token>, si 401 reintenta con Bearer)
      let r = await postJson(
        BUSCAR_FISCAL_PATH,
        { dni_miembro: dni },
        { Authorization: token }
      );

      if (!r.ok && r.status === 401) {
        console.warn('401 con Authorization: <token>. Reintentando con Bearer …');
        r = await postJson(
          BUSCAR_FISCAL_PATH,
          { dni_miembro: dni },
          { Authorization: `Bearer ${token}` }
        );
      }

      if (!r.ok) {
        const msg =
          typeof r.payload === 'string'
            ? r.payload
            : (r.payload as { message?: string })?.message || 'DNI no registrado';
        setError(msg);
        return;
      }

      const fiscal = r.payload as {
        dni_miembro?: unknown;
        nombre?: unknown;
        [k: string]: unknown;
      };
      if (
        typeof fiscal?.dni_miembro !== 'string' ||
        typeof fiscal?.nombre !== 'string'
      ) {
        setError('DNI no registrado');
        return;
      }

      setResult(fiscal);
      localStorage.setItem('fiscalData', JSON.stringify(fiscal));
      history.push('/fiscalizacion-acciones', { fiscalData: fiscal });

      // (Opcional) ejemplo de “listar” con asignado: true
      // const l = await postJson(
      //   '/api/fiscalizacion/listar',
      //   { dni_miembro: dni, asignado: true },
      //   { Authorization: token }
      // );
      // if (!l.ok) throw new Error(typeof l.payload === 'string' ? l.payload : (l.payload as { message?: string }).message || 'Error en listar');
      // setResult(l.payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'DNI no registrado';
      setError(msg || 'DNI no registrado');
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
            {typeof result === 'string'
              ? result
              : JSON.stringify(result as unknown, null, 2)}
          </pre>
        )}
      </IonContent>
    </Layout>
  );
};

export default FiscalizacionLookup;
