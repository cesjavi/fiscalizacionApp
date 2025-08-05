import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonModal,
  IonFooter,
  IonIcon,
  IonItem,
  IonLabel,
  useIonViewWillEnter,
} from '@ionic/react';
import { Button, Input } from '../components';
import Layout from '../components/Layout';
import { Camera, CameraResultType } from '@capacitor/camera';
import { add, remove, create } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { voterDB } from '../voterDB';
import { useAuth } from '../AuthContext';
import EscrutinioModal from './EscrutinioModal';

interface Voter {
  id?: number;
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
  voto?: boolean;
}

const VoterList: React.FC = () => {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [searchDni, setSearchDni] = useState('');
  const [searchOrden, setSearchOrden] = useState('');
  const [votingFrozen, setVotingFrozen] = useState(() => {
    const stored = localStorage.getItem('votingFrozen');
    return stored ? JSON.parse(stored) : false;
  });
  const history = useHistory();

  useEffect(() => {
    localStorage.setItem('votingFrozen', JSON.stringify(votingFrozen));
  }, [votingFrozen]);

  const loadVoters = async () => {
    try {
      const data = await voterDB.voters.toArray();
      data.sort(
        (a, b) =>
          (a.personasVotantes?.[0]?.numero_de_orden ?? 0) -
          (b.personasVotantes?.[0]?.numero_de_orden ?? 0)
      );
      setVoters(data);
    } catch (error) {
      console.error('Error al cargar votantes:', error);
    }
  };
const deleteVoter = async (id: number) => {
  if (votingFrozen || !id) return;

  try {
    if (window.confirm('¿Estás seguro de que querés eliminar este votante?')) {
      await voterDB.voters.delete(id);
      setVoters(prev => prev.filter(v => v.id !== id));
    }
  } catch (error) {
    console.error('Error al eliminar votante:', error);
  }
};


const toggleVoto = async (id: number) => {
  if (votingFrozen) return;
  const voterToToggle = voters.find(v => v.id === id);
  if (!voterToToggle) return;

  const newValue = !voterToToggle.voto;
  await voterDB.voters.update(id, { voto: newValue });
  setVoters(prev =>
    prev.map(v => (v.id === id ? { ...v, voto: newValue } : v))
  );
};

  const handleEndVoting = async () => {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        quality: 80,
      });
      if (photo?.dataUrl) {
        localStorage.setItem('endVotingPhoto', photo.dataUrl);
      }
    } catch (err) {
      console.error('Error taking photo', err);
    }
    setVotingFrozen(true);
    history.push('/escrutinio');
  };

  const handleConfig = () => {
    history.push('/select-mesa');
  };

  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    history.push('/login');
  };


  useIonViewWillEnter(() => {
    loadVoters();
  });

  useEffect(() => {
    loadVoters();
  }, []);

  const filteredVoters = voters.filter(voter => {
    const dni = (voter.persona?.dni || '').toString().toLowerCase();
    const orden =
      (voter.personasVotantes?.[0]?.numero_de_orden || '').toString();

    const matchesDni =
      searchDni.trim() === '' || dni.includes(searchDni.toLowerCase());
    const matchesOrden =
      searchOrden.trim() === '' || orden.includes(searchOrden);

    return matchesDni && matchesOrden;
  });

  return (
    <Layout backHref="/select-mesa">
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


<IonContent fullscreen className="p-4">
  {votingFrozen && (
    <div className="text-center text-red-500 mb-4">
      La lista está congelada.
    </div>
  )}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
    <IonItem>
      <IonLabel position="stacked">Buscar por DNI</IonLabel>
      <Input
        value={searchDni}
        onIonChange={e => setSearchDni(e.detail.value ?? '')}
        placeholder="DNI"
      />
    </IonItem>
    <IonItem>
      <IonLabel position="stacked">Buscar por Orden</IonLabel>
      <Input
        value={searchOrden}
        onIonChange={e => setSearchOrden(e.detail.value ?? '')}
        placeholder="Orden"
      />
    </IonItem>
  </div>
  <div className="grid gap-4">
    {filteredVoters.length === 0 ? (
      <div className="text-gray-500 text-center">No hay votantes cargados.</div>
    ) : (
      filteredVoters.map((voter, index) => {
        const persona = {
          nombre: voter.persona?.nombre ?? '-',
          apellido: voter.persona?.apellido ?? '-'
        };
        const votante = {
          dni: voter.personasVotantes?.[0]?.dni ?? '-',
          numero_de_orden: voter.personasVotantes?.[0]?.numero_de_orden ?? '-'
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const id = (voter as any).id as number;
        const voto = voter.voto ?? false;

        return (
          <div
            key={index}
            data-testid={`voter-row-${index}`}
            className={`rounded shadow p-4 grid grid-cols-5 items-center gap-2 ${
              voter.voto ? 'bg-green-50' : 'bg-white'
            }`}
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
              {voter.voto ? (
                <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
                  Votó
                </span>
              ) : (
                <button
                  data-testid="toggle-vote"
                  disabled={votingFrozen}
                  className={`px-2 py-1 text-xs font-medium text-white rounded ${
                    votingFrozen
                      ? 'bg-blue-300 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                  onClick={() => toggleVoto(id)}
                >
                  Marcar voto
                </button>
              )}
            </div>

            {/* Columna 5: Botón */}
            <div>
              <button
                disabled={votingFrozen}
                className={`w-32 px-2 py-1 text-xs font-medium text-white rounded ${
                  voto ? 'bg-green-500' : 'bg-blue-500'
                } ${votingFrozen ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => toggleVoto(id)}
              >
                {voto ? 'Votó' : 'Votar'}
              </button>
            </div>

            {/* Columna 6: Acciones */}
            <div className="flex space-x-2">
              <button
                disabled={votingFrozen}
                className="px-2 py-1 text-xs font-medium text-white bg-yellow-500 rounded hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Editar
              </button>
              <button
                disabled={votingFrozen}
                className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => deleteVoter(id)}
              >
                Eliminar
              </button>
            </div>
          </div>
        );
      })
    )}
  </div>
</IonContent>

      <IonModal
        isOpen={EscrutinioModal}
        onDidDismiss={() => setShowEscrutinioModal(false)}
      >
        <EscrutinioModal onClose={() => setShowEscrutinioModal(false)} />
      </IonModal>

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

    </Layout>
  );
};


export default VoterList;
