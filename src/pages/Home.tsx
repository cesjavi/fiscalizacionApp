import { IonContent } from '@ionic/react';
import { Button, FooterBar } from '../components';
import Layout from '../components/Layout';
import './Home.css';

const Home: React.FC = () => {
  return (
    <Layout footer={<FooterBar />}>
      <IonContent className="ion-padding flex flex-col items-center justify-center text-center gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">Bienvenido</h1>
          <p className="text-gray-600">Seleccione una opción para comenzar</p>
        </div>
        <div className="w-full grid gap-4">
          <Button routerLink="/escrutinio" expand="block">
            Ir a Escrutinio
          </Button>
          <Button routerLink="/voter-count" expand="block" color="secondary">
            Conteo de Votantes
          </Button>
        </div>
      </IonContent>
    </Layout>
  );
};

export default Home;
