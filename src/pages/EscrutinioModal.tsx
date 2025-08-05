import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonButtons
} from '@ionic/react';
import { useState } from 'react';
import { Button, Input } from '../components';

interface EscrutinioModalProps {
  onClose: () => void;
}

export interface ResultadoEscrutinio {
  lista100: number;
  votoEnBlanco: number;
  nulo: number;
  recurrido: number;
}

const EscrutinioModal: React.FC<EscrutinioModalProps> = ({ onClose }) => {
  const [lista100, setLista100] = useState('');
  const [votoEnBlanco, setVotoEnBlanco] = useState('');
  const [nulo, setNulo] = useState('');
  const [recurrido, setRecurrido] = useState('');

  const handleSubmit = async () => {
    const datos: ResultadoEscrutinio = {
      lista100: parseInt(lista100, 10) || 0,
      votoEnBlanco: parseInt(votoEnBlanco, 10) || 0,
      nulo: parseInt(nulo, 10) || 0,
      recurrido: parseInt(recurrido, 10) || 0
    };
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
        onClose();
      } else {
        alert(res.statusText || 'Error al enviar escrutinio');
      }
    } catch {
      alert('Error al enviar escrutinio');
    }
  };

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Escrutinio</IonTitle>
          <IonButtons slot="end">
            <Button onClick={onClose}>Cancelar</Button>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonItem>
          <IonLabel position="stacked">Lista 100</IonLabel>
          <Input
            type="number"
            value={lista100}
            onIonChange={e => setLista100(e.detail.value ?? '')}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Voto en blanco</IonLabel>
          <Input
            type="number"
            value={votoEnBlanco}
            onIonChange={e => setVotoEnBlanco(e.detail.value ?? '')}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Nulo</IonLabel>
          <Input
            type="number"
            value={nulo}
            onIonChange={e => setNulo(e.detail.value ?? '')}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Recurrido</IonLabel>
          <Input
            type="number"
            value={recurrido}
            onIonChange={e => setRecurrido(e.detail.value ?? '')}
          />
        </IonItem>
        <Button expand="block" className="ion-margin-top" onClick={handleSubmit}>
          Enviar
        </Button>
      </IonContent>
    </>
  );
};

export default EscrutinioModal;

