import {
  IonContent,
  IonItem,
  IonLabel,
  IonText
} from '@ionic/react';
import { Button, Input } from '../components';
import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import Layout from '../components/Layout';

interface Lista {
  lista: string;
  nro_lista?: string;
  id: string;
}

const Escrutinio: React.FC = () => {
  const [listas, setListas] = useState<Lista[]>([]);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    const fetchListas = async () => {
      const snapshot = await getDocs(collection(db, 'listas'));
      const data: Lista[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Lista, 'id'>)
      }));
      setListas(data);
    };
    fetchListas();
  }, []);

  const handleChange = (id: string, value: string) => {
    setValores((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async () => {
    const datos = listas.reduce((acc, l) => {
      acc[l.lista] = parseInt(valores[l.id], 10) || 0;
      return acc;
    }, {} as Record<string, number>);
    setResultado(datos);
    const mesaId = Number(localStorage.getItem('mesaId'));
    try {
      const res = await fetch('/api/escrutinio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mesa_id: mesaId,
          datos: JSON.stringify(datos)
        })
      });
      if (res.ok) {
        alert('Escrutinio enviado correctamente');
      } else {
        alert(res.statusText || 'Error al enviar escrutinio');
      }
    } catch {
      alert('Error al enviar escrutinio');
    }
  };

  return (
    <Layout backHref="/voters">
      <IonContent className="ion-padding">
        {listas.map((l) => (
          <IonItem key={l.id}>
            <IonLabel position="stacked">
              {l.nro_lista ? `${l.nro_lista} - ${l.lista}` : l.lista}
            </IonLabel>
            <Input
              type="number"
              value={valores[l.id] || ''}
              onIonChange={(e) => handleChange(l.id, e.detail.value ?? '')}
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
