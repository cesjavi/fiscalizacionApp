import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton
} from '@ionic/react';
import { useState } from 'react';
import { useHistory } from 'react-router-dom';

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
      persona: { nombre, apellido },
      personasVotantes: [
        {
          numero_de_orden: parseInt(orden, 10) || 0,
          dni: votanteDni,
          genero
        }
      ],
      fechaEnviado: new Date().toISOString()
    };
    await fetch('/api/voters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    history.push('/voters');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Agregar Votante</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <form onSubmit={handleSubmit}>
          <IonItem>
            <IonLabel position="stacked">Nombre</IonLabel>
            <IonInput value={nombre} onIonChange={e => setNombre(e.detail.value ?? '')} />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Apellido</IonLabel>
            <IonInput value={apellido} onIonChange={e => setApellido(e.detail.value ?? '')} />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Número de Orden</IonLabel>
            <IonInput
              value={orden}
              onIonChange={e => setOrden(e.detail.value ?? '')}
              required
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">DNI Votante</IonLabel>
            <IonInput
              value={votanteDni}
              onIonChange={e => setVotanteDni(e.detail.value ?? '')}
              required
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Género</IonLabel>
            <IonInput value={genero} onIonChange={e => setGenero(e.detail.value ?? '')} />
          </IonItem>
          <IonButton expand="block" type="submit" className="ion-margin-top">
            Guardar
          </IonButton>
        </form>
      </IonContent>
    </IonPage>
  );
};

export default AddVoter;
