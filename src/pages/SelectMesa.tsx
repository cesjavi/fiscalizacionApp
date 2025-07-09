import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonButton,
} from '@ionic/react';
import { useState } from 'react';
import { useHistory } from 'react-router-dom';

const sessions = ['Mañana', 'Tarde', 'Noche'];
const circuits = ['Circuito 1', 'Circuito 2', 'Circuito 3'];
const mesas = ['Mesa 1', 'Mesa 2', 'Mesa 3'];

const SelectMesa: React.FC = () => {
  const history = useHistory();
  const [session, setSession] = useState<string>();
  const [circuit, setCircuit] = useState<string>();
  const [mesa, setMesa] = useState<string>();

  const handleNext = () => {
    history.push('/home');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Seleccionar Mesa</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonItem>
          <IonLabel>Sesión</IonLabel>
          <IonSelect
            value={session}
            placeholder="Seleccione sesión"
            onIonChange={(e) => setSession(e.detail.value)}
          >
            {sessions.map((s) => (
              <IonSelectOption key={s} value={s}>
                {s}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>

        <IonItem>
          <IonLabel>Circuito</IonLabel>
          <IonSelect
            value={circuit}
            placeholder="Seleccione circuito"
            onIonChange={(e) => setCircuit(e.detail.value)}
          >
            {circuits.map((c) => (
              <IonSelectOption key={c} value={c}>
                {c}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>

        <IonItem>
          <IonLabel>Mesa</IonLabel>
          <IonSelect
            value={mesa}
            placeholder="Seleccione mesa"
            onIonChange={(e) => setMesa(e.detail.value)}
          >
            {mesas.map((m) => (
              <IonSelectOption key={m} value={m}>
                {m}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>

        <IonButton expand="block" onClick={handleNext}>
          Siguiente
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default SelectMesa;
