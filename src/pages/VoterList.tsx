import {
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
import Layout from '../components/Layout';
import { add, remove, create } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';

interface Voter {
  establecimiento?: {
    seccion?: string;
    circuito?: string;
    mesa?: string;
  };
  persona: {
    dni?: string;
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

  const handleEndVoting = () => {
    history.push('/escrutinio');
  };

  const handleConfig = () => {
    history.push('/select-mesa');
  };

  useEffect(() => {
    fetch('/api/voters')
      .then((res) => res.json())
      .then((data) => setVoters(data));
  }, []);

  return (
    <Layout
      footer={
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
      }
    >
      <IonContent>
        <IonList>
          {voters.map((voter, index) => (
            <IonItem key={index} lines="full">
              <IonLabel>
                {voter.persona.nombre} {voter.persona.apellido}
                {voter.personasVotantes[0]?.dni && ` - ${voter.personasVotantes[0].dni}`}
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
    </Layout>
  );
};

export default VoterList;
