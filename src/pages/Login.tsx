import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonList
} from '@ionic/react';
import Layout from '../components/Layout';
import { Button, Input } from '../components';
import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const Login: React.FC = () => {
  const history = useHistory();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const users: { username: string; dni: string; password: string }[] =
      JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(
      (u) => u.username === username && u.password === password
    );
    if (user) {
      login();
      history.push('/select-mesa');
    } else {
      alert('Usuario o contraseña incorrectos');
    }
  };

  return (
    <Layout>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Login</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <form onSubmit={handleLogin}>
          <IonList>
            <IonItem>
              <IonLabel position="floating">Username</IonLabel>
              <Input
                value={username}
                onIonChange={(e) => setUsername(e.detail.value!)}
                required
              />
            </IonItem>
            <IonItem>
              <IonLabel position="floating">Password</IonLabel>
              <Input
                type="password"
                value={password}
                onIonChange={(e) => setPassword(e.detail.value!)}
                required
              />
            </IonItem>
          </IonList>
          <Button expand="block" type="submit" className="ion-margin-top">
            LOGIN
          </Button>
        </form>
        <Button
          expand="block"
          routerLink="/register"
          color="secondary"
          className="ion-margin-top"
        >
          REGISTER
        </Button>
      </IonContent>
    </Layout>
  );
};

export default Login;
