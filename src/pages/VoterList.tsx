import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonButton
} from '@ionic/react';
import { useEffect, useState } from 'react';

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

  useEffect(() => {
    fetch('/api/voters')
      .then((res) => res.json())
      .then((data) => setVoters(data));
  }, []);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Listado de Votantes</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonButton routerLink="/add-voter" expand="block" className="ion-margin-bottom">
          Agregar Votante
        </IonButton>
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
    </IonPage>
  );
};

export default VoterList;
