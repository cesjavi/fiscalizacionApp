import { IonContent, IonItem, IonLabel, IonSelect, IonSelectOption, IonButton } from '@ionic/react';
import Layout from '../components/Layout';
import { useState } from 'react';
import { useHistory } from 'react-router-dom';

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
          <IonButton expand="block" type="submit" className="ion-margin-top">Submit Vote</IonButton>
        </form>
      </IonContent>
    </Layout>
  );
};

export default VoteSubmission;
