import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel } from '@ionic/react';
import { Button, Input } from '../components';
import { useState } from 'react';
import { useHistory } from 'react-router-dom';

const Register: React.FC = () => {
  const history = useHistory();
  const [username, setUsername] = useState('');
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    users.push({ username, dni, password });
    localStorage.setItem('users', JSON.stringify(users));
    history.push('/login');
  };

  return (
    <Layout>
      <IonContent className="ion-padding">
        <form onSubmit={handleRegister}>
          <IonItem>
            <IonLabel position="stacked">Username</IonLabel>
            <Input value={username} onIonChange={e => setUsername(e.detail.value!)} required />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">DNI</IonLabel>
            <Input value={dni} onIonChange={e => setDni(e.detail.value!)} required />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Password</IonLabel>
            <Input type="password" value={password} onIonChange={e => setPassword(e.detail.value!)} required />
          </IonItem>
          <Button expand="block" type="submit" className="ion-margin-top">Register</Button>
        </form>
        <Button expand="block" routerLink="/login" className="ion-margin-top">
          Login
        </Button>
      </IonContent>
    </Layout>
  );
};

export default Register;
