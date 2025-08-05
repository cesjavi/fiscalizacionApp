import {
  IonContent,
  IonItem,
  IonLabel,
  IonText
} from '@ionic/react';
import { Button, Input } from '../components';
import { useState } from 'react';
import Layout from '../components/Layout';

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
  const [foto, setFoto] = useState('');
  const [resultado, setResultado] = useState<ResultadoEscrutinio | null>(null);

  const handleSubmit = async () => {
    const datos: ResultadoEscrutinio = {
      lista100: parseInt(lista100, 10) || 0,
      votoEnBlanco: parseInt(votoEnBlanco, 10) || 0,
      nulo: parseInt(nulo, 10) || 0,
      recurrido: parseInt(recurrido, 10) || 0
    };
    setResultado(datos);
    const mesaId = Number(localStorage.getItem('mesaId'));
    try {
      const res = await fetch('/api/escrutinio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mesa_id: mesaId,
          datos: JSON.stringify(datos),
          foto
        })
      });
      if (res.ok) {
        alert('Escrutinio enviado correctamente');
      } else {
        alert(res.statusText || 'Error al enviar escrutinio');
      }
    } catch {
      alert('Error al enviar escrutinio');
    }
  };

  return (
    <Layout backHref="/voters">
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
        <IonItem>
          <IonLabel position="stacked">Foto (URL o base64)</IonLabel>
          <Input
            type="text"
            value={foto}
            onIonChange={(e) => setFoto(e.detail.value ?? '')}
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
