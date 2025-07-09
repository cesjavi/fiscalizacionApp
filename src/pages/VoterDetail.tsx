import { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonIcon,
  IonList
} from '@ionic/react';
import { add, trash } from 'ionicons/icons';

interface Voter {
  numero_de_orden: string;
  dni: string;
  genero: string;
}

const VoterDetail: React.FC = () => {
  const [voters, setVoters] = useState<Voter[]>([{
    numero_de_orden: '',
    dni: '',
    genero: ''
  }]);

  const updateVoter = (index: number, key: keyof Voter, value: string) => {
    const newVoters = [...voters];
    newVoters[index] = { ...newVoters[index], [key]: value };
    setVoters(newVoters);
  };

  const addRow = () => {
    setVoters([...voters, { numero_de_orden: '', dni: '', genero: '' }]);
  };

  const removeRow = (index: number) => {
    const newVoters = voters.filter((_, i) => i !== index);
    setVoters(newVoters.length ? newVoters : [{ numero_de_orden: '', dni: '', genero: '' }]);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Voter Detail</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonList>
          {voters.map((voter, index) => (
            <IonItem key={index} lines="none">
              <IonInput
                placeholder="Numero de Orden"
                value={voter.numero_de_orden}
                onIonChange={e => updateVoter(index, 'numero_de_orden', e.detail.value || '')}
              />
              <IonInput
                placeholder="DNI"
                value={voter.dni}
                onIonChange={e => updateVoter(index, 'dni', e.detail.value || '')}
              />
              <IonSelect
                placeholder="Genero"
                value={voter.genero}
                onIonChange={e => updateVoter(index, 'genero', e.detail.value)}
              >
                <IonSelectOption value="Masculino">Masculino</IonSelectOption>
                <IonSelectOption value="Femenino">Femenino</IonSelectOption>
                <IonSelectOption value="Otro">Otro</IonSelectOption>
              </IonSelect>
              <IonButton
                color="danger"
                fill="clear"
                onClick={() => removeRow(index)}
                aria-label="Eliminar fila"
              >
                <IonIcon icon={trash} />
              </IonButton>
            </IonItem>
          ))}
        </IonList>
        <IonButton expand="block" onClick={addRow} aria-label="Agregar fila">
          <IonIcon icon={add} slot="start" />Agregar
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default VoterDetail;
