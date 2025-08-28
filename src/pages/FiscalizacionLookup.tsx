import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/react';
import { Button, Input } from '../components';
import Layout from '../components/Layout';
import { useState } from 'react';

interface LookupResult {
  nombre: string;
  apellido: string;
  zona: string;
}

const FiscalizacionLookup: React.FC = () => {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [dniMiembro, setDniMiembro] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    try {
      const baseUrl =
        process.env.API_URL ?? 'http://api.lalibertadavanzacomuna7.com/api';

      const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, password }),
      });

      if (!loginRes.ok) {
        throw new Error('Error al iniciar sesión');
      }

      const loginData: { token?: string } = await loginRes.json();
      const token = loginData.token;
      if (!token) {
        throw new Error('Token no recibido');
      }

      localStorage.setItem('token', token);

      const lookupRes = await fetch(`${baseUrl}/fiscalizacion/listar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify({ dni_miembro: dniMiembro, asignado: true }),
      });

      if (!lookupRes.ok) {
        throw new Error('Error al buscar fiscalización');
      }

      const data = await lookupRes.json();
      setResult({
        nombre: data.nombre,
        apellido: data.apellido,
        zona: data.zona,
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  return (
    <Layout>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Buscar Fiscalización</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <form onSubmit={handleSubmit}>
          <IonList>
            <IonItem>
              <IonLabel position="floating">Usuario</IonLabel>
              <Input
                value={usuario}
                onIonChange={(e) => setUsuario(e.detail.value!)}
                required
              />
            </IonItem>
            <IonItem>
              <IonLabel position="floating">Clave</IonLabel>
              <Input
                type="password"
                value={password}
                onIonChange={(e) => setPassword(e.detail.value!)}
                required
              />
            </IonItem>
            <IonItem>
              <IonLabel position="floating">DNI Miembro</IonLabel>
              <Input
                value={dniMiembro}
                onIonChange={(e) => setDniMiembro(e.detail.value!)}
                required
              />
            </IonItem>
          </IonList>
          <Button expand="block" type="submit" className="ion-margin-top">
            Buscar
          </Button>
        </form>
        {error && (
          <div className="text-red-500 ion-margin-top">{error}</div>
        )}
        {result && (
          <div className="ion-margin-top">
            <p>
              {result.nombre} {result.apellido}
            </p>
            <p>Zona: {result.zona}</p>
          </div>
        )}
      </IonContent>
    </Layout>
  );
};

export default FiscalizacionLookup;

