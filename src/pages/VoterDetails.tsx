import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel, IonInput, IonButton } from '@ionic/react';
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
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Voter Details</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <form onSubmit={handleSubmit}>
          <IonItem>
            <IonLabel position="stacked">Name</IonLabel>
            <IonInput value={name} onIonChange={e => setName(e.detail.value!)} required />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">ID</IonLabel>
            <IonInput value={id} onIonChange={e => setId(e.detail.value!)} required />
          </IonItem>
          <IonButton expand="block" type="submit" className="ion-margin-top">Save Details</IonButton>
        </form>
      </IonContent>
    </IonPage>
  );
};

export default VoterDetails;
