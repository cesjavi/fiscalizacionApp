import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel, IonInput, IonButton } from '@ionic/react';
import { useState } from 'react';
import { useHistory } from 'react-router-dom';

const Register: React.FC = () => {
  const history = useHistory();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    users.push({ username, password });
    localStorage.setItem('users', JSON.stringify(users));
    history.push('/login');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Register</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <form onSubmit={handleRegister}>
          <IonItem>
            <IonLabel position="stacked">Username</IonLabel>
            <IonInput value={username} onIonChange={e => setUsername(e.detail.value!)} required />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Password</IonLabel>
            <IonInput type="password" value={password} onIonChange={e => setPassword(e.detail.value!)} required />
          </IonItem>
          <IonButton expand="block" type="submit" className="ion-margin-top">Register</IonButton>
        </form>
      </IonContent>
    </IonPage>
  );
};

export default Register;
