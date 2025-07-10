import {
  IonToolbar,
  IonTitle,
  IonContent,
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
  voted?: boolean;
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

  const handleLogout = () => {
    logout();
    history.push('/login');
  };

  const markAsVoted = (index: number) => {
    setVoters(voters.map((voter, i) => i === index ? { ...voter, voted: true } : voter));
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
      </IonHeader>
      <IonContent className="p-4">
        <div className="grid gap-4">
          {voters.map((voter, index) => (
            <div
              key={index}
              className="bg-white rounded shadow p-4 flex flex-col md:grid md:grid-cols-5 md:items-center gap-2"
            >
              <div>
                <div className="font-medium">
                  {voter.persona.nombre} {voter.persona.apellido}
                </div>
                <div className="text-sm text-gray-500">
                  {voter.personasVotantes[0]?.dni || '-'}
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {voter.personasVotantes[0]?.numero_de_orden ?? '-'}
              </div>
              <div>
                <span
                  className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded ${voter.voted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                >
                  {voter.voted ? 'Votó' : 'No votó'}
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  className="px-2 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600"
                  onClick={() => markAsVoted(index)}
                >
                  Marcar como votó
                </button>
                <button className="px-2 py-1 text-xs font-medium text-white bg-yellow-500 rounded hover:bg-yellow-600">
                  Editar
                </button>
                <button className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600">
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </IonContent>
    </Layout>
  );
};

export default VoterList;
