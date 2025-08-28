import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/react';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Button, Input } from '../components';
import { getToken, setToken, clearToken } from '../utils/api';

const FiscalizacionLookup: React.FC = () => {
  const [token, setTokenState] = useState<string>('');
  const [inputToken, setInputToken] = useState('');

  useEffect(() => {
    const existing = getToken();
    if (existing) {
      setTokenState(existing);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputToken.trim()) {
      setToken(inputToken.trim());
      setTokenState(inputToken.trim());
      setInputToken('');
    }
  };

  const handleLogoutApi = () => {
    clearToken();
    setTokenState('');
  };

  return (
    <Layout>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Fiscalizacion Lookup</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {token ? (
          <div className="grid gap-4">
            <p>Token cargado correctamente.</p>
            <Button onClick={handleLogoutApi}>Cerrar sesión API</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <Input
              value={inputToken}
              onIonChange={e => setInputToken(e.detail.value ?? '')}
              placeholder="Token de API"
            />
            <Button type="submit" expand="block">
              Guardar Token
            </Button>
          </form>
        )}
      </IonContent>
    </Layout>
  );
};

export default FiscalizacionLookup;
