import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
} from '@ionic/react';
import { useState } from 'react';
import { useHistory } from 'react-router-dom';

const SelectMesa: React.FC = () => {
  const history = useHistory();
  const [seccion, setSeccion] = useState('');
  const [circuito, setCircuito] = useState('');
  const [mesa, setMesa] = useState('');

  const handleNext = () => {
    localStorage.setItem('seccion', seccion);
    localStorage.setItem('circuito', circuito);
    localStorage.setItem('mesa', mesa);
    history.push('/voters');
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
          <IonInput
            value={seccion}
            inputmode="numeric"
            maxlength={3}
            onIonChange={(e) => setSeccion(e.detail.value ?? '')}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Circuito</IonLabel>
          <IonInput
            value={circuito}
            inputmode="numeric"
            maxlength={3}
            onIonChange={(e) => setCircuito(e.detail.value ?? '')}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Mesa</IonLabel>
          <IonInput
            value={mesa}
            inputmode="numeric"
            maxlength={4}
            onIonChange={(e) => setMesa(e.detail.value ?? '')}
          />
        </IonItem>

        <IonButton
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
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default SelectMesa;
