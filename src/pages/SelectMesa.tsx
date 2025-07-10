import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
} from '@ionic/react';
import { Button, Input } from '../components';
import { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';

const SelectMesa: React.FC = () => {
  const history = useHistory();
  const [seccion, setSeccion] = useState('');
  const [circuito, setCircuito] = useState('');
  const [mesa, setMesa] = useState('');
  const [editing, setEditing] = useState(true);

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

  const handleNext = () => {
    localStorage.setItem('seccion', seccion);
    localStorage.setItem('circuito', circuito);
    localStorage.setItem('mesa', mesa);
    setEditing(false);
    history.push('/voters');
  };

  const handleModify = () => {
    setEditing(true);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Configurar Mesa</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonItem>
          <IonLabel position="stacked">Sección</IonLabel>
          <Input
            value={seccion}
            inputmode="numeric"
            maxlength={3}
            disabled={!editing}
            onIonChange={(e) => setSeccion(e.detail.value ?? '')}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Circuito</IonLabel>
          <Input
            value={circuito}
            inputmode="numeric"
            maxlength={3}
            disabled={!editing}
            onIonChange={(e) => setCircuito(e.detail.value ?? '')}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Mesa</IonLabel>
          <Input
            value={mesa}
            inputmode="numeric"
            maxlength={4}
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
            !(
              seccion.length === 3 &&
              circuito.length === 3 &&
              mesa.length === 4
            )
          }
        >
          Siguiente
        </Button>
      </IonContent>
    </IonPage>
  );
};

export default SelectMesa;
