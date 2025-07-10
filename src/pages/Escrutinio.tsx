import {
  IonContent,
  IonItem,
  IonLabel,
  IonText
} from '@ionic/react';
import { Button, Input } from '../components';
import { useState } from 'react';

interface ResultadoEscrutinio {
  lista100: number;
  votoEnBlanco: number;
  nulo: number;
  recurrido: number;
}

const Escrutinio: React.FC = () => {
  const [lista100, setLista100] = useState('');
  const [votoEnBlanco, setVotoEnBlanco] = useState('');
  const [nulo, setNulo] = useState('');
  const [recurrido, setRecurrido] = useState('');
  const [resultado, setResultado] = useState<ResultadoEscrutinio | null>(null);

  const handleSubmit = () => {
    const data: ResultadoEscrutinio = {
      lista100: parseInt(lista100, 10) || 0,
      votoEnBlanco: parseInt(votoEnBlanco, 10) || 0,
      nulo: parseInt(nulo, 10) || 0,
      recurrido: parseInt(recurrido, 10) || 0
    };
    setResultado(data);
    console.log('Resultado enviado', data);
  };

  return (
    <Layout>
      <IonContent className="ion-padding">
        <IonItem>
          <IonLabel position="stacked">Lista 100</IonLabel>
          <Input
            type="number"
            value={lista100}
            onIonChange={(e) => setLista100(e.detail.value ?? '')}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Voto en blanco</IonLabel>
          <Input
            type="number"
            value={votoEnBlanco}
            onIonChange={(e) => setVotoEnBlanco(e.detail.value ?? '')}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Nulo</IonLabel>
          <Input
            type="number"
            value={nulo}
            onIonChange={(e) => setNulo(e.detail.value ?? '')}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Recurrido</IonLabel>
          <Input
            type="number"
            value={recurrido}
            onIonChange={(e) => setRecurrido(e.detail.value ?? '')}
          />
        </IonItem>
        <Button expand="block" className="ion-margin-top" onClick={handleSubmit}>
          Enviar
        </Button>
        {resultado && (
          <IonText className="ion-margin-top">
            <pre>{JSON.stringify(resultado, null, 2)}</pre>
          </IonText>
        )}
      </IonContent>
    </Layout>
  );
};

export default Escrutinio;
