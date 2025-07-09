import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem } from '@ionic/react';
import { useHistory } from 'react-router-dom';

const mesas = [1, 2, 3];

const MesaSelection: React.FC = () => {
  const history = useHistory();
  const selectMesa = (id: number) => {
    localStorage.setItem('selectedMesa', String(id));
    history.push('/vote');
  };
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Mesas</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          {mesas.map(id => (
            <IonItem button key={id} onClick={() => selectMesa(id)}>
              Mesa {id}
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default MesaSelection;
