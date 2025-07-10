import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel } from '@ionic/react';
import { Button, Input } from '../components';
import { useState } from 'react';

const VoterDetails: React.FC = () => {
  const [name, setName] = useState('');
  const [id, setId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('voterName', name);
    localStorage.setItem('voterId', id);
  };

  return (
    <Layout>
      <IonContent className="ion-padding">
        <form onSubmit={handleSubmit}>
          <IonItem>
            <IonLabel position="stacked">Name</IonLabel>
            <Input value={name} onIonChange={e => setName(e.detail.value!)} required />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">ID</IonLabel>
            <Input value={id} onIonChange={e => setId(e.detail.value!)} required />
          </IonItem>
          <Button expand="block" type="submit" className="ion-margin-top">Save Details</Button>
        </form>
      </IonContent>
    </Layout>
  );
};

export default VoterDetails;
