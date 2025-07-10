import {
  IonContent,
  IonItem,
  IonLabel
} from '@ionic/react';
import { Button, Input } from '../components';
import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import Layout from '../components/Layout';
import { voterDB } from '../db/voters';

const AddVoter: React.FC = () => {
  const history = useHistory();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [orden, setOrden] = useState('');
  const [votanteDni, setVotanteDni] = useState('');
  const [genero, setGenero] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      seccion: localStorage.getItem('seccion'),
      circuito: localStorage.getItem('circuito'),
      mesa: localStorage.getItem('mesa'),
      dni: votanteDni,
      nombre,
      apellido,
      numero_de_orden: parseInt(orden, 10) || 0,
      genero,
      fechaEnviado: new Date().toISOString(),
    };
    try {
      await voterDB.voters.add(data);
      history.push('/voters');
    } catch {
      alert('Error al guardar votante');
    }
  };

  return (
    <Layout>
      <IonContent className="ion-padding">
        <form onSubmit={handleSubmit}>
          <IonItem>
            <IonLabel position="stacked">Nombre</IonLabel>
            <Input value={nombre} onIonChange={e => setNombre(e.detail.value ?? '')} />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Apellido</IonLabel>
            <Input value={apellido} onIonChange={e => setApellido(e.detail.value ?? '')} />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Número de Orden</IonLabel>
            <Input
              value={orden}
              onIonChange={e => setOrden(e.detail.value ?? '')}
              required
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">DNI Votante</IonLabel>
            <Input
              value={votanteDni}
              onIonChange={e => setVotanteDni(e.detail.value ?? '')}
              required
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Género</IonLabel>
            <Input value={genero} onIonChange={e => setGenero(e.detail.value ?? '')} />
          </IonItem>
          <Button expand="block" type="submit" className="ion-margin-top">
            Guardar
          </Button>
        </form>
      </IonContent>
    </Layout>
  );
};

export default AddVoter;
