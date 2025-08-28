import { IonContent, IonItem, IonLabel } from '@ionic/react';
import { useState } from 'react';
import Layout from '../components/Layout';
import { Button, Input } from '../components';

const FiscalizacionLookup: React.FC = () => {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [dni, setDni] = useState('');
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const LOGIN_PATH  = '/api/auth/login';
  const LISTAR_PATH = '/api/fiscalizacion/listar';

async function postJson(path: string, body: unknown, headers: Record<string,string>) {
  const resp = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const ct = resp.headers.get('content-type') || '';
  const payload = ct.includes('application/json') ? await resp.json() : await resp.text();
  return { ok: resp.ok, status: resp.status, payload };
}

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setResult(null);

  // 1) LOGIN { usuario, password }
  const login = await postJson(LOGIN_PATH, { usuario, password }, {});
  if (!login.ok) {
    const msg = typeof login.payload === 'string' ? login.payload : login.payload.message || 'Error al iniciar sesión';
    setError(msg); return;
  }
  type LoginPayload = { token: string; [key: string]: unknown };
  const loginPayload = login.payload as LoginPayload;
  const token: string = loginPayload.token;
  if (!token) { setError('Token no encontrado'); return; }
  localStorage.setItem('token', token);
  console.log('Token:', token);

  // 2) LISTAR con retry:
  //   2a) Authorization: Bearer <token>
  let listar = await postJson(LISTAR_PATH, { dni_miembro: dni, asignado: true }, { Authorization: `Bearer ${token}` });
  console.log('Listar (1):', listar);
  console.log('Listar (1) payload:', listar.payload);
  //   2b) Si 401, probamos Authorization: <token>
  if (!listar.ok && listar.status === 401) {
    console.warn('401 con Bearer; reintentando sin Bearer…');
    listar = await postJson(LISTAR_PATH, { dni_miembro: dni, asignado: true }, { Authorization: token });
  }

  if (!listar.ok) {
    const msg = typeof listar.payload === 'string' ? listar.payload : listar.payload.message || 'Error al obtener los datos';
    setError(msg); return;
  }

  setResult(listar.payload);
};

  return (
    <Layout backHref="/login">
      <IonContent className="ion-padding">
        <form onSubmit={handleSubmit}>
          <IonItem>
            <IonLabel position="stacked">Usuario / DNI</IonLabel>
            <Input
              value={usuario}
              onIonChange={e => setUsuario(e.detail.value!)}
              required
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Contraseña</IonLabel>
            <Input
              type="password"
              value={password}
              onIonChange={e => setPassword(e.detail.value!)}
              required
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">DNI del miembro</IonLabel>
            <Input
              value={dni}
              onIonChange={e => setDni(e.detail.value!)}
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
        {result && (
          <pre className="ion-margin-top whitespace-pre-wrap">
            {JSON.stringify(result as object, null, 2)}
          </pre>
        )}
      </IonContent>
    </Layout>
  );
};

export default FiscalizacionLookup;
