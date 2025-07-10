import { IonContent, IonItem, IonLabel } from '@ionic/react';
import { Button, Input } from '../components';
import { useState } from 'react';
import Layout from '../components/Layout';

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
          <Input
            value={session}
            onIonChange={(e) => setSession(e.detail.value ?? '')}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Circuit</IonLabel>
          <Input
            value={circuit}
            onIonChange={(e) => setCircuit(e.detail.value ?? '')}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Mesa</IonLabel>
          <Input
            value={mesa}
            onIonChange={(e) => setMesa(e.detail.value ?? '')}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Count</IonLabel>
          <Input
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
        <Button expand="block" onClick={saveData} className="ion-margin-top">
          Save
        </Button>
      </IonContent>
    </Layout>
  );
};

export default VoterCount;
