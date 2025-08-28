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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    try {
      const loginResp = await fetch(
        'http://api.lalibertadavanzacomuna7.com/api/users/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dni: usuario, password }),
        },
      );
      if (!loginResp.ok) {
        const text = await loginResp.text();
        throw new Error(text || 'Error al iniciar sesión');
      }
      const loginData = await loginResp.json();
      const token = loginData.token;
      if (!token) {
        throw new Error('Token no encontrado');
      }
      localStorage.setItem('token', token);

      const response = await fetch(
        'http://api.lalibertadavanzacomuna7.com/api/fiscalizacion/listar',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ dni_miembro: dni }),
        },
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Error al obtener los datos');
      }
      const data = await response.json();
      setResult(data);
    } catch (err) {
      let message = 'Error en la solicitud';
      if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
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
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </IonContent>
    </Layout>
  );
};

export default FiscalizacionLookup;
