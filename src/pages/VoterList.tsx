import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonButtons,
  IonFooter,
  IonIcon
} from '@ionic/react';
import { add, remove, create } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../AuthContext';

interface Voter {
  establecimiento: {
    seccion: string;
    circuito: string;
    mesa: string;
  };
  persona: {
    dni: string;
    nombre: string;
    apellido: string;
  };
  personasVotantes: {
    numero_de_orden: number;
    dni: string;
    genero: string;
  }[];
  fechaEnviado: string;
}

const VoterList: React.FC = () => {
  const [voters, setVoters] = useState<Voter[]>([]);
  const history = useHistory();
  const { logout } = useAuth();

  const handleEndVoting = () => {
    history.push('/escrutinio');
  };

  const handleConfig = () => {
    history.push('/select-mesa');
  };

  const handleLogout = () => {
    logout();
    history.push('/login');
  };

  useEffect(() => {
    fetch('/api/voters')
      .then((res) => res.json())
      .then((data) => setVoters(data));
  }, []);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={handleEndVoting}>Terminar Votación</IonButton>
          </IonButtons>
          <IonTitle>Listado de Votantes</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleConfig}>Configurar</IonButton>
            <IonButton onClick={handleLogout}>Cerrar Sesión</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          {voters.map((voter, index) => (
            <IonItem key={index} lines="full">
              <IonLabel>
                {voter.persona.nombre} {voter.persona.apellido} - {voter.persona.dni}
              </IonLabel>
              {voter.personasVotantes[0] && (
                <IonLabel slot="end">
                  {voter.personasVotantes[0].numero_de_orden}
                </IonLabel>
              )}
            </IonItem>
          ))}
        </IonList>
      </IonContent>
      <IonFooter>
        <IonToolbar>
          <IonButtons>
            <IonButton routerLink="/add-voter">
              <IonIcon icon={add} />
            </IonButton>
            <IonButton>
              <IonIcon icon={remove} />
            </IonButton>
            <IonButton>
              <IonIcon icon={create} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default VoterList;
