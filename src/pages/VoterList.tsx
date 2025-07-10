import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonButtons,
  IonFooter,
  IonIcon,
  useIonViewWillEnter,
} from '@ionic/react';
import { Button } from '../components';
import Layout from '../components/Layout';
import { add, remove, create } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { voterDB } from '../voterDB';

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
  personasVotantes?: {
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

  const loadVoters = async () => {
    try {
      const data = await voterDB.voters.toArray();
      setVoters(data);
    } catch (error) {
      console.error('Error al cargar votantes:', error);
    }
  };
  const deleteVoter = async (index: number) => {
  const voterToDelete = voters[index];
  const id = (voterToDelete as any).id; // asumiendo que `id` está incluido

  if (!id) return;

  try {
    if (window.confirm('¿Estás seguro de que querés eliminar este votante?')) {
      await voterDB.voters.delete(id);
      setVoters((prev) => prev.filter((_, i) => i !== index));
    }
  } catch (error) {
    console.error('Error al eliminar votante:', error);
  }
};


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
    setVoters((prev) =>
      prev.map((voter, i) => (i === index ? { ...voter, voted: true } : voter))
    );
  };

  useIonViewWillEnter(() => {
    loadVoters();
  });

  useEffect(() => {
    loadVoters();
  }, []);

  return (
    <Layout>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <Button onClick={handleEndVoting}>Terminar Votación</Button>
          </IonButtons>
          <IonTitle>Listado de Votantes</IonTitle>
          <IonButtons slot="end">
            <Button onClick={handleConfig}>Configurar</Button>
            <Button onClick={handleLogout}>Cerrar Sesión</Button>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>        
      </IonContent>

      <IonFooter>
        <IonToolbar>
          <IonButtons>
            <Button routerLink="/add-voter">
              <IonIcon icon={add} />
            </Button>
            <Button>
              <IonIcon icon={remove} />
            </Button>
            <Button>
              <IonIcon icon={create} />
            </Button>
          </IonButtons>
        </IonToolbar>
      </IonFooter>
<IonContent className="p-4">
  <div className="grid gap-4">
    {voters.length === 0 ? (
      <div className="text-gray-500 text-center">No hay votantes cargados.</div>
    ) : (
      voters.map((voter, index) => {
        const persona = { nombre: (voter as any).nombre ?? '-', apellido: (voter as any).apellido ?? '-' };
const votante = {
  dni: (voter as any).dni ?? '-',
  numero_de_orden: (voter as any).numero_de_orden ?? '-'
};


        return (
          <div
            key={index}
            className="bg-white rounded shadow p-4 flex flex-col md:grid md:grid-cols-5 md:items-center gap-2"
          >
            {/* Columna 1: Nombre y Apellido */}
            <div className="font-medium">
              {persona.nombre ?? '-'} {persona.apellido ?? '-'}
            </div>

            {/* Columna 2: DNI */}
            <div className="text-sm text-gray-500">
              {votante?.dni ?? '-'}
            </div>

            {/* Columna 3: Número de orden */}
            <div className="text-sm text-gray-500">
              {votante?.numero_de_orden ?? '-'}
            </div>

            {/* Columna 4: Estado */}
            <div>
              <span
                className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded ${
                  voter.voted
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {voter.voted ? 'Votó' : 'No votó'}
              </span>
            </div>

            {/* Columna 5: Acciones */}
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
              <button className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600"
              onClick={() => deleteVoter(index)}>
                Eliminar
              </button>
            </div>
          </div>
        );
      })
    )}
  </div>
</IonContent>

    </Layout>
  );
};

function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('user');
}

export default VoterList;
