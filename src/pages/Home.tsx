import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton } from '@ionic/react';
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
        <IonButton routerLink="/escrutinio" expand="block" className="ion-margin-top">
          Ir a Escrutinio
        </IonButton>
        <IonButton expand="block" routerLink="/voter-count" className="ion-margin-top">
          Go to Voter Count
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default Home;
