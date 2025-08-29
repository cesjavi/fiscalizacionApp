import { IonContent } from '@ionic/react';
import Layout from '../components/Layout';
import { Button } from '../components';
import { useFiscalData } from '../FiscalDataContext';
import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';

const FiscalizacionActions: React.FC = () => {
  const history = useHistory();
  const { hasFiscalData, setFiscalData } = useFiscalData();

  useEffect(() => {
    if (!hasFiscalData) {
      const stored = localStorage.getItem('fiscalData');
      if (stored) {
        try {
          setFiscalData(JSON.parse(stored));
        } catch {
          history.replace('/fiscalizacion-lookup');
        }
      } else {
        history.replace('/fiscalizacion-lookup');
      }
    }
  }, [hasFiscalData, history, setFiscalData]);

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
