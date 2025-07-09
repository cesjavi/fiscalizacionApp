import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
} from '@ionic/react';
import { useEffect, useState } from 'react';

interface Voter {
  numero_de_orden: string;
  dni: string;
  genero: string;
}

const SAMPLE_VOTERS: Voter[] = [
  { numero_de_orden: '001', dni: '11111111', genero: 'M' },
  { numero_de_orden: '002', dni: '22222222', genero: 'F' },
];

const VoterList: React.FC = () => {
  const [voters, setVoters] = useState<Voter[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('voters');
    if (stored) {
      setVoters(JSON.parse(stored));
    } else {
      setVoters(SAMPLE_VOTERS);
      localStorage.setItem('voters', JSON.stringify(SAMPLE_VOTERS));
    }
  }, []);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Listado de Votantes</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          {voters.map((voter, index) => (
            <IonItem key={index} lines="full">
              <IonLabel>{voter.numero_de_orden}</IonLabel>
              <IonLabel>{voter.dni}</IonLabel>
              <IonLabel>{voter.genero}</IonLabel>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default VoterList;
