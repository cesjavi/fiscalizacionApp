import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel, IonSelect, IonSelectOption } from '@ionic/react';
import { Button } from '../components';
import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import Layout from '../components/Layout';

const VoteSubmission: React.FC = () => {
  const history = useHistory();
  const [candidate, setCandidate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('vote', candidate);
    history.push('/voter');
  };

  return (
    <Layout>
      <IonContent className="ion-padding">
        <form onSubmit={handleSubmit}>
          <IonItem>
            <IonLabel>Candidate</IonLabel>
            <IonSelect value={candidate} onIonChange={e => setCandidate(e.detail.value)} required>
              <IonSelectOption value="A">Candidate A</IonSelectOption>
              <IonSelectOption value="B">Candidate B</IonSelectOption>
            </IonSelect>
          </IonItem>
          <Button expand="block" type="submit" className="ion-margin-top">Submit Vote</Button>
        </form>
      </IonContent>
    </Layout>
  );
};

export default VoteSubmission;
