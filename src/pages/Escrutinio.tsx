import {
  IonContent,
  IonItem,
  IonLabel,
  IonText
} from '@ionic/react';
import { Button, Input } from '../components';
import { useRef, useState, ChangeEvent } from 'react';
import Layout from '../components/Layout';
import { Camera, CameraResultType } from '@capacitor/camera';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import app, { getStorage } from '../firebase';

interface Lista {
  lista: string;
  nro_lista?: string;
  id: string;
}

const Escrutinio: React.FC = () => {
  const [lista100, setLista100] = useState('');
  const [votoEnBlanco, setVotoEnBlanco] = useState('');
  const [nulo, setNulo] = useState('');
  const [recurrido, setRecurrido] = useState('');
  const [foto, setFoto] = useState('');
  const [resultado, setResultado] = useState<ResultadoEscrutinio | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFoto = async () => {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        quality: 80
      });
      if (photo.dataUrl) {
        setFoto(photo.dataUrl);
      }
    } catch {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const fetchListas = async () => {
      const snapshot = await getDocs(collection(db, 'listas'));
      const data: Lista[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Lista, 'id'>)
      }));
      setListas(data);
    };
    fetchListas();
  }, []);

  const handleChange = (id: string, value: string) => {
    setValores((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async () => {
    const datos = listas.reduce((acc, l) => {
      acc[l.lista] = parseInt(valores[l.id], 10) || 0;
      return acc;
    }, {} as Record<string, number>);
    setResultado(datos);
    const mesaId = Number(localStorage.getItem('mesaId'));
    let fotoUrl = foto;
    if (foto) {
      try {
        const storage = getStorage(app);
        const storageRef = ref(
          storage,
          `escrutinio/${mesaId}-${Date.now()}.jpg`
        );
        await uploadString(storageRef, foto, 'data_url');
        fotoUrl = await getDownloadURL(storageRef);
      } catch (err) {
        console.error('Error uploading photo', err);
      }
    }
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
