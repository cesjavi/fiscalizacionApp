import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonList
} from '@ionic/react';
import { Button, Input } from '../components';
import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Layout from '../components/Layout';

const Login: React.FC = () => {
  const history = useHistory();
  const { login } = useAuth();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(usuario, password);
      history.push('/select-mesa');
    } catch (err) {
      console.error(err);
      alert('Usuario o clave incorrectos');
    }
  };

  return (
    <Layout>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Ingresar (Login)</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <form onSubmit={handleLogin}>
          <IonList>
            <IonItem>
              <IonLabel position="floating">Usuario</IonLabel>
              <Input
                value={usuario}
                onIonChange={(e) => setUsuario(e.detail.value!)}
                required
              />
            </IonItem>
            <IonItem>
              <IonLabel position="floating">Clave</IonLabel>
              <Input
                type="password"
                value={password}
                onIonChange={(e) => setPassword(e.detail.value!)}
                required
              />
            </IonItem>
          </IonList>
          <Button expand="block" type="submit" className="ion-margin-top">
            INGRESAR
          </Button>
        </form>
        {/**
         * Button to navigate to register page.
         */}
        <Button
          expand="block"
          routerLink="/register"
          color="secondary"
          className="ion-margin-top"
        >
          REGISTRARSE
        </Button>
      </IonContent>
    </Layout>
  );
};

export default Login;
