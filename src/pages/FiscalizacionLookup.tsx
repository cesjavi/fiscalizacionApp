import { IonContent, IonItem, IonLabel } from '@ionic/react';
import { useState } from 'react';
import Layout from '../components/Layout';
import { Button, Input } from '../components';

const FiscalizacionLookup: React.FC = () => {
  const [dni, setDni] = useState('');
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Token no encontrado');
      return;
    }

    try {
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
            <IonLabel position="stacked">DNI del miembro</IonLabel>
            <Input
              value={dni}
              onIonChange={e => setDni(e.detail.value!)}
              required
            />
          </IonItem>
          <Button expand="block" type="submit" className="ion-margin-top">
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
