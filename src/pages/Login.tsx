import {
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonList
} from '@ionic/react';
import Layout from '../components/Layout';
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
      <IonContent className="ion-padding">
        <form onSubmit={handleLogin}>
          <IonList>
            <IonItem>
              <IonLabel position="floating">Username</IonLabel>
              <IonInput
                value={username}
                onIonChange={(e) => setUsername(e.detail.value!)}
                required
              />
            </IonItem>
            <IonItem>
              <IonLabel position="floating">Password</IonLabel>
              <IonInput
                type="password"
                value={password}
                onIonChange={(e) => setPassword(e.detail.value!)}
                required
              />
            </IonItem>
          </IonList>
          <IonButton expand="block" type="submit" className="ion-margin-top">
            LOGIN
          </IonButton>
        </form>
        <IonButton
          expand="block"
          routerLink="/register"
          color="secondary"
          className="ion-margin-top"
        >
          REGISTER
        </IonButton>
      </IonContent>
    </Layout>
  );
};

export default Login;
