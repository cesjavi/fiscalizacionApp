import { IonContent } from '@ionic/react';
import Layout from '../components/Layout';
import { Button } from '../components';

const FiscalizacionActions: React.FC = () => {
  return (
    <Layout backHref="/fiscalizacion-lookup">
      <IonContent className="ion-padding flex flex-col gap-4">
        <Button routerLink="/voters">Votación</Button>
        <Button routerLink="/escrutinio">Enviar Resultado</Button>
      </IonContent>
    </Layout>
  );
};

export default FiscalizacionActions;
