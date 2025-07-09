import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel, IonInput, IonButton } from '@ionic/react';
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
    const users: { username: string; dni: string; password: string }[] = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find((u) => u.username === username && u.password === password);
    if (user) {
      login();
      history.push('/select-mesa');
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Login</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <form onSubmit={handleLogin}>
          <IonItem>
            <IonLabel position="stacked">Username</IonLabel>
            <IonInput value={username} onIonChange={e => setUsername(e.detail.value!)} required />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Password</IonLabel>
            <IonInput type="password" value={password} onIonChange={e => setPassword(e.detail.value!)} required />
          </IonItem>
          <IonButton expand="block" type="submit" className="ion-margin-top">Login</IonButton>
        </form>
        <IonButton expand="block" routerLink="/register" className="ion-margin-top">
          Register
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default Login;
