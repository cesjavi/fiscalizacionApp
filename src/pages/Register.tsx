import { IonContent, IonItem, IonLabel } from '@ionic/react';
import { Button, Input } from '../components';
import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Layout from '../components/Layout';

const Register: React.FC = () => {
  const history = useHistory();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(dni, password);
      history.push('/login');
    } catch (err: unknown) {
      console.error('Error al registrarse:', err);
      let message = '';
      if (err instanceof Error) {
        message = err.message;
      } else {
        message = JSON.stringify(err);
      }
      alert('Error al registrarse: ' + message);
    }
  };

  return (
    <Layout backHref="/login">
      <IonContent className="ion-padding">
        <form onSubmit={handleRegister}>
          <IonItem>
            <IonLabel position="stacked">Email</IonLabel>
            <Input value={email} onIonChange={e => setEmail(e.detail.value!)} required />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">DNI</IonLabel>
            <Input value={dni} onIonChange={e => setDni(e.detail.value!)} required />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Clave</IonLabel>
            <Input type="password" value={password} onIonChange={e => setPassword(e.detail.value!)} required />
          </IonItem>
          <Button expand="block" type="submit" className="ion-margin-top">Registrarse</Button>
        </form>
        <Button expand="block" routerLink="/login" className="ion-margin-top">
          Login
        </Button>
      </IonContent>
    </Layout>
  );
};

export default Register;
