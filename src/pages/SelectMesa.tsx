import {
  IonContent,
  IonItem,
  IonLabel,
} from '@ionic/react';
import { Button, Input } from '../components';
import { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import Layout from '../components/Layout';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { voterDB, VoterRecord } from '../voterDB';

const SelectMesa: React.FC = () => {
  const history = useHistory();
  const [seccion, setSeccion] = useState('');
  const [circuito, setCircuito] = useState('');
  const [mesa, setMesa] = useState('');
  const [editing, setEditing] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedSeccion = localStorage.getItem('seccion');
    const savedCircuito = localStorage.getItem('circuito');
    const savedMesa = localStorage.getItem('mesa');
    if (savedSeccion && savedCircuito && savedMesa) {
      setSeccion(savedSeccion);
      setCircuito(savedCircuito);
      setMesa(savedMesa);
      setEditing(false);
    }
  }, []);

  const handleNext = async () => {
    localStorage.setItem('seccion', seccion);
    localStorage.setItem('circuito', circuito);
    localStorage.setItem('mesa', mesa);
    localStorage.setItem('mesaId', mesa); 
    setEditing(false);
    setLoading(true);
    try {
      const q = query(collection(db, 'votantes'), where('mesa', '==', mesa));
      await voterDB.voters.clear();
      const snapshot = await getDocs(q);
      for (const doc of snapshot.docs) {
  const d = doc.data();
  // Adaptar los campos planos a la estructura esperada
  const record: VoterRecord = {
    persona: {
      dni: d['DNI Votante'],
      nombre: d['Nombre'],
      apellido: d['Apellido'],
    },
    personasVotantes: [
      {
        numero_de_orden: Number(d['Número de Orden']),
        dni: d['DNI Votante'],
        genero: d['Género'],
      }
    ],
    establecimiento: {
      mesa: d['mesa'] || ''
      // seccion, circuito: podrías agregarlos si tenés esos datos
    },
    fechaEnviado: '', // si tenés campo de fecha lo ponés acá
    voto: false // si no hay info de esto, lo dejás en false o null
  };
  await voterDB.voters.add(record);
}

      history.push('/voters');
    } catch (error) {
      alert('Error al cargar votantes');
      console.error('Error fetching voters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModify = () => {
    setEditing(true);
  };

  return (
    <Layout backHref="/login">
      <IonContent className="ion-padding">
        <IonItem>
          <IonLabel position="stacked">Sección</IonLabel>
          <Input
            value={seccion}
            inputmode="numeric"
            maxLength={3}
            disabled={!editing}
            onIonChange={(e) => setSeccion(e.detail.value ?? '')}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Circuito</IonLabel>
          <Input
            value={circuito}
            inputmode="numeric"
            maxLength={3}
            disabled={!editing}
            onIonChange={(e) => setCircuito(e.detail.value ?? '')}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Mesa</IonLabel>
          <Input
            value={mesa}
            inputmode="numeric"
            maxLength={4}
            disabled={!editing}
            onIonChange={(e) => setMesa(e.detail.value ?? '')}
          />
        </IonItem>

        {!editing && (
          <Button expand="block" onClick={handleModify}>
            Modificar
          </Button>
        )}
        <Button
          expand="block"
          onClick={handleNext}
          disabled={
            loading ||
            !(
              seccion.length === 3 &&
              circuito.length === 3 &&
              mesa.length === 4
            )
          }
        >
          {loading ? 'Cargando...' : 'Siguiente'}
        </Button>
        <Button
          expand="block"
          onClick={() => history.push('/fiscalizacion-lookup')}
        >
          Fiscalización Lookup
        </Button>
      </IonContent>
    </Layout>
  );
};

export default SelectMesa;
