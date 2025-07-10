import {
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
} from '@ionic/react';
import Layout from '../components/Layout';
import { useState } from 'react';

const VoterCount: React.FC = () => {
  const [session, setSession] = useState('');
  const [circuit, setCircuit] = useState('');
  const [mesa, setMesa] = useState('');
  const [count, setCount] = useState<number>(0);

  const saveData = () => {
    const data = { session, circuit, mesa, count };
    localStorage.setItem('voterCount', JSON.stringify(data));
  };

  return (
    <Layout>
      <IonContent className="ion-padding">
        <IonItem>
          <IonLabel position="stacked">Session</IonLabel>
          <IonInput
            value={session}
            onIonChange={(e) => setSession(e.detail.value ?? '')}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Circuit</IonLabel>
          <IonInput
            value={circuit}
            onIonChange={(e) => setCircuit(e.detail.value ?? '')}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Mesa</IonLabel>
          <IonInput
            value={mesa}
            onIonChange={(e) => setMesa(e.detail.value ?? '')}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Count</IonLabel>
          <IonInput
            type="number"
            min="0"
            max="500"
            value={count}
            onIonChange={(e) => {
              const value = parseInt(e.detail.value || '0', 10);
              if (!Number.isNaN(value)) {
                const clamped = Math.min(500, Math.max(0, value));
                setCount(clamped);
              }
            }}
          />
        </IonItem>
        <IonButton expand="block" onClick={saveData} className="ion-margin-top">
          Save
        </IonButton>
      </IonContent>
    </Layout>
  );
};

export default VoterCount;
