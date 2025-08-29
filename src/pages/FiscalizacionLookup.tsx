import React, { useState } from 'react';
import { IonContent, IonItem, IonLabel } from '@ionic/react';
import Layout from '../components/Layout';
import { Button, Input } from '../components';

type ApiOk<T = any> = { ok: true; status: number; payload: T };
type ApiFail = { ok: false; status: number; payload: any };
type ApiResp<T = any> = ApiOk<T> | ApiFail;

const LOGIN_PATHS = ['/api/users/login', '/api/auth/login'] as const;
const LISTAR_PATH = '/api/fiscalizacion/listar';
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
    if (r.ok && typeof (r.payload as any)?.token === 'string') {
      return (r.payload as any).token as string;
    }
    lastErr =
      typeof r.payload === 'string'
        ? r.payload
        : r.payload?.message || `${r.status} Error`;
  }
  throw new Error(lastErr || 'No se pudo iniciar sesión');
}

const FiscalizacionLookup: React.FC = () => {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [dni, setDni] = useState('');
  const [result, setResult] = useState<unknown | null>(null);
  const [error, setError] = useState<string | null>(null);

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
            : r.payload?.message || 'Error en la solicitud';
        setError(msg);
        return;
      }

      setResult(r.payload);

      // (Opcional) ejemplo de “listar” con asignado: true
      // const l = await postJson(
      //   LISTAR_PATH,
      //   { dni_miembro: dni, asignado: true },
      //   { Authorization: token }
      // );
      // if (!l.ok) throw new Error(typeof l.payload === 'string' ? l.payload : l.payload?.message || 'Error en listar');
      // setResult(l.payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en la solicitud');
    }
  };

  return (
    <Layout backHref="/login">
      <IonContent className="ion-padding">
        <form onSubmit={handleSubmit}>
          <IonItem>
            <IonLabel position="stacked">Usuario / DNI</IonLabel>
            <Input
              value={usuario}
              onIonChange={(e) => setUsuario(e.detail.value!)}
              required
            />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">Contraseña</IonLabel>
            <Input
              type="password"
              value={password}
              onIonChange={(e) => setPassword(e.detail.value!)}
              required
            />
          </IonItem>

          <IonItem>
            <IonLabel position="stacked">DNI del miembro</IonLabel>
            <Input
              value={dni}
              onIonChange={(e) => setDni(e.detail.value!)}
              disabled={!usuario || !password}
              required
            />
          </IonItem>

          <Button
            expand="block"
            type="submit"
            className="ion-margin-top"
            disabled={!usuario || !password}
          >
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
