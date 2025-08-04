import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonSegment,
  IonSegmentButton
} from '@ionic/react';
import { Button, Input } from '../components';
import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Layout from '../components/Layout';

const Login: React.FC = () => {
  const history = useHistory();
  const { login, loginWithDni } = useAuth();
  const [mode, setMode] = useState<'email' | 'dni'>('email');
  const [email, setEmail] = useState('');
  const [dni, setDni] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [dniPassword, setDniPassword] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, emailPassword);
      history.push('/select-mesa');
    } catch (err) {
      console.error(err);
      alert('Usuario o clave incorrectos');
    }
  };

  const handleDniLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log(dni, dniPassword);
      await loginWithDni(dni, dniPassword);
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
        <IonSegment value={mode} onIonChange={(e) => setMode(e.detail.value as 'email' | 'dni')}>
          <IonSegmentButton value="email">
            <IonLabel>Email</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="dni">
            <IonLabel>DNI</IonLabel>
          </IonSegmentButton>
        </IonSegment>
        {mode === 'email' ? (
          <form onSubmit={handleEmailLogin}>
            <IonList>
              <IonItem>
                <IonLabel position="floating">Email</IonLabel>
                <Input
                  type="email"
                  value={email}
                  onIonChange={(e) => setEmail(e.detail.value!)}
                  required
                />
              </IonItem>
              <IonItem>
                <IonLabel position="floating">Clave</IonLabel>
                <Input
                  type="password"
                  value={emailPassword}
                  onIonChange={(e) => setEmailPassword(e.detail.value!)}
                  required
                />
              </IonItem>
            </IonList>
            <Button expand="block" type="submit" className="ion-margin-top">
              INGRESAR
            </Button>
          </form>
        ) : (
          <form onSubmit={handleDniLogin}>
            <IonList>
              <IonItem>
                <IonLabel position="floating">DNI</IonLabel>
                <Input
                  value={dni}
                  onIonChange={(e) => setDni(e.detail.value!)}
                  required
                />
              </IonItem>
              <IonItem>
                <IonLabel position="floating">Clave</IonLabel>
                <Input
                  type="password"
                  value={dniPassword}
                  onIonChange={(e) => setDniPassword(e.detail.value!)}
                  required
                />
              </IonItem>
            </IonList>
            <Button expand="block" type="submit" className="ion-margin-top">
              INGRESAR
            </Button>
          </form>
        )}
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
