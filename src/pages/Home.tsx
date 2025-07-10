import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { Button } from '../components';
import ExploreContainer from '../components/ExploreContainer';
import './Home.css';

const Home: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Blank</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Blank</IonTitle>
          </IonToolbar>
        </IonHeader>
        <ExploreContainer />
        <Button routerLink="/escrutinio" expand="block" className="ion-margin-top">
          Ir a Escrutinio
        </Button>
        <Button expand="block" routerLink="/voter-count" className="ion-margin-top">
          Go to Voter Count
        </Button>
      </IonContent>
    </IonPage>
  );
};

export default Home;
