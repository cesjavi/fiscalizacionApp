import { IonContent } from '@ionic/react';
import { Button } from '../components';
import ExploreContainer from '../components/ExploreContainer';
import Layout from '../components/Layout';
import './Home.css';

const Home: React.FC = () => {
  return (
    <Layout>
      <IonContent fullscreen>
        <ExploreContainer />
        <Button routerLink="/escrutinio" expand="block" className="ion-margin-top">
          Ir a Escrutinio
        </Button>
        <Button expand="block" routerLink="/voter-count" className="ion-margin-top">
          Go to Voter Count
        </Button>
      </IonContent>
    </Layout>
  );
};

export default Home;
