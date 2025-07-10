import { IonContent, IonButton } from '@ionic/react';
import Layout from '../components/Layout';
import ExploreContainer from '../components/ExploreContainer';
import './Home.css';

const Home: React.FC = () => {
  return (
    <Layout>
      <IonContent fullscreen>
        <ExploreContainer />
        <IonButton routerLink="/escrutinio" expand="block" className="ion-margin-top">
          Ir a Escrutinio
        </IonButton>
        <IonButton expand="block" routerLink="/voter-count" className="ion-margin-top">
          Go to Voter Count
        </IonButton>
      </IonContent>
    </Layout>
  );
};

export default Home;
