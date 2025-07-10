import {
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
} from '@ionic/react';
import { Button } from '../components';
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

    // Validación básica
    if (!nombre || !apellido || !votanteDni || !orden) {
      alert('Por favor completá todos los campos obligatorios.');
      return;
    }

    const data = {
      seccion: localStorage.getItem('seccion') ?? '',
      circuito: localStorage.getItem('circuito') ?? '',
      mesa: localStorage.getItem('mesa') ?? '',
      dni: votanteDni,
      nombre,
      apellido,
      numero_de_orden: parseInt(orden, 10) || 0,
      genero,
      fechaEnviado: new Date().toISOString(),
      voted: false
    };

    try {
      const id = await voterDB.voters.add(data);
      console.log('Votante guardado con ID:', id);
      history.push('/voters');
    } catch (error) {
      console.error('Error al guardar votante:', error);
      alert('Error al guardar votante');
    }
  };

  return (
    <Layout>
      <IonContent className="ion-padding">
        <form onSubmit={handleSubmit}>
          <IonItem>
            <IonLabel position="stacked">Nombre</IonLabel>
            <IonInput
              value={nombre}
              onInput={e => setNombre((e.target as HTMLInputElement).value)}
              required
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Apellido</IonLabel>
            <IonInput
              value={apellido}
              onInput={e => setApellido((e.target as HTMLInputElement).value)}
              required
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Número de Orden</IonLabel>
            <IonInput
              value={orden}
              type="number"
              onInput={e => setOrden((e.target as HTMLInputElement).value)}              
              required
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">DNI Votante</IonLabel>
            <IonInput
              value={votanteDni}
              onInput={e => setVotanteDni((e.target as HTMLInputElement).value)}
              required
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Género</IonLabel>
            <IonInput
              value={genero}
              onInput={e => setGenero((e.target as HTMLInputElement).value)}
            />
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
