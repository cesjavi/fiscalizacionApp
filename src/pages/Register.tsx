import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonInput, IonButton, IonItem } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useState } from 'react';

const Register: React.FC = () => {
  const history = useHistory();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    history.push('/home');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Register</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <form onSubmit={handleSubmit}>
          <IonItem>
            <IonInput
              label="Email"
              value={email}
              onIonChange={e => setEmail(e.detail.value!)}
              required
            />
          </IonItem>
          <IonItem>
            <IonInput
              type="password"
              label="Password"
              value={password}
              onIonChange={e => setPassword(e.detail.value!)}
              required
            />
          </IonItem>
          <IonButton expand="block" type="submit">
            Register
          </IonButton>
        </form>
      </IonContent>
    </IonPage>
  );
};

export default Register;
