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
      <IonContent className="ion-padding">
        <div className="flex flex-col items-center 1gap-4">
        <Button routerLink="/voters" className="w-4/5">Votación</Button>
        <Button routerLink="/escrutinio" className="w-4/5">Enviar Resultado</Button>
        </div>
      </IonContent>
    </Layout>
  );
};

export default FiscalizacionActions;
