import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent  
} from '@ionic/react';
import { Button } from '../components';
//import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Layout from '../components/Layout';

const Login: React.FC = () => {
  const history = useHistory();
  const { loginWithGoogle } = useAuth();
  

  
  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      history.push('/fiscalizacion-lookup');
    } catch (err) {
      console.error(err);
      alert('No se pudo iniciar sesión con Google');
    }
  };

  return (
    <Layout>
      <IonHeader>
        <IonToolbar>
          <IonTitle>FISCALIZACION</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">        
        <Button
          expand="block"
          color="tertiary"
          className="ion-margin-top"
          onClick={handleGoogleLogin}
        >
          Ingresar con Google
        </Button>
      </IonContent>
    </Layout>
  );
};

export default Login;
