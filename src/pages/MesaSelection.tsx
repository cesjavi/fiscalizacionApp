import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent
} from '@ionic/react';
import { useHistory } from 'react-router-dom';

interface Mesa {
  id: number;
  name: string;
  location: string;
}

const mesas: Mesa[] = [
  { id: 1, name: 'Mesa 1', location: 'Salón A' },
  { id: 2, name: 'Mesa 2', location: 'Salón B' },
  { id: 3, name: 'Mesa 3', location: 'Salón C' }
];

const MesaSelection: React.FC = () => {
  const history = useHistory();
  const selectMesa = (id: number) => {
    localStorage.setItem('selectedMesa', String(id));
    history.push('/vote');
  };
  const editMesa = (id: number) => {
    localStorage.setItem('selectedMesa', String(id));
    history.push('/select-mesa');
  };
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Mesas</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {mesas.map(mesa => (
            <div
              key={mesa.id}
              className="bg-white dark:bg-neutral-800 rounded shadow p-4 flex flex-col justify-between"
            >
              <div>
                <h2 className="text-lg font-semibold">{mesa.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {mesa.location}
                </p>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  className="flex-1 rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700 active:bg-blue-800"
                  onClick={() => selectMesa(mesa.id)}
                >
                  Seleccionar
                </button>
                <button
                  className="flex-1 rounded bg-gray-600 px-3 py-1 text-white hover:bg-gray-700 active:bg-gray-800"
                  onClick={() => editMesa(mesa.id)}
                >
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      </IonContent>
    </Layout>
  );
};

export default MesaSelection;
