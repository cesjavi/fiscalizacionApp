import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import {
  IonContent,
  IonItem,
  IonLabel,
  IonText
} from '@ionic/react';
import { Button, Input } from '../components';
import Layout from '../components/Layout';
import { Camera, CameraResultType } from '@capacitor/camera';
import { getDocs, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useHistory } from 'react-router-dom';
import { useFiscalData } from '../FiscalDataContext';


interface Lista {
  id: string;
  lista: string;
  nro_lista?: string;  
}


const CAMPOS_ESPECIALES = ['BLANCO', 'RECURRIDOS', 'NULOS', 'IMPUGNADOS'];

const Escrutinio: React.FC = () => {
  const history = useHistory();
  const { hasFiscalData, setFiscalData } = useFiscalData();
  const [valores, setValores] = useState<Record<string, string>>({});
  const [foto, setFoto] = useState('');
  const [resultado, setResultado] = useState<Record<string, number> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [listas, setListas] = useState<Lista[]>([]);
  // Cargar las listas desde Firestore al iniciar
  useEffect(() => {
    if (!hasFiscalData) {
      const stored = localStorage.getItem('fiscalData');
      if (stored) {
        try {
          setFiscalData(JSON.parse(stored));
        } catch {
          history.replace('/fiscalizacion-lookup');
        }
      } else {
        history.replace('/fiscalizacion-lookup');
      }
    }
    const fetchListas = async () => {
      const snapshot = await getDocs(collection(db, 'listas'));
      const data: Lista[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Lista, 'id'>)
      }));
      setListas(data);
    };
    fetchListas();
  }, [hasFiscalData, history, setFiscalData]);

  // Handler de inputs
  const handleChange = (id: string, value: string) => {
    setValores((prev) => ({ ...prev, [id]: value }));
  };

  // Capturar foto
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

  // Para subir foto manual
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Al enviar
  const handleSubmit = async () => {
  const datos: Record<string, number> = {};

  listas.forEach(l => {
    datos[l.lista] = parseInt(valores[l.id], 10) || 0;
  });

  CAMPOS_ESPECIALES.forEach(key => {
    datos[key] = parseInt(valores[key], 10) || 0;
  });

  setResultado(datos);

  const mesaId = Number(localStorage.getItem('mesaId'));
  const payload = {
    mesa_id: mesaId,
    datos,
    fecha: new Date().toISOString(),
    foto,
    // podés sumar más campos si querés
  };
  try {
    await addDoc(collection(db, 'escrutinio'), payload);
    alert('Escrutinio enviado correctamente');
    setFoto('');
  } catch (err) {
    alert('Error al guardar en Firestore');
    console.error(err);
  }
};


  return (
    <Layout backHref="/voters">
      <IonContent className="ion-padding">
        {/* Inputs para todas las listas */}
        {listas.map((l) => (
          <IonItem key={l.id}>
            <IonLabel position="stacked">
              {l.nro_lista ? `${l.nro_lista} - ${l.lista}` : l.lista}
            </IonLabel>
            <Input
              type="number"
              value={valores[l.id] || ''}
              onIonChange={e => handleChange(l.id, e.detail.value ?? '')}
              placeholder="Cantidad de votos"
            />
          </IonItem>
        ))}

        {/* Inputs para los campos especiales */}
        {CAMPOS_ESPECIALES.map(key => (
          <IonItem key={key}>
            <IonLabel position="stacked">{key}</IonLabel>
            <Input
              type="number"
              value={valores[key] || ''}
              onIonChange={e => handleChange(key, e.detail.value ?? '')}
              placeholder={`Cantidad de votos ${key.toLowerCase()}`}
            />
          </IonItem>
        ))}

        {/* Subir foto */}
        <IonItem>
          <IonLabel position="stacked">Foto (opcional)</IonLabel>
          <Button onClick={handleFoto}>Tomar/Subir Foto</Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
             title="Subir foto de acta"
          />
          {foto && (
            <img src={foto} alt="Foto de acta" className="max-w-xs mt-2 rounded shadow" />
          )}
        </IonItem>

        <Button expand="block" className="ion-margin-top" onClick={handleSubmit}>
          Enviar
        </Button>

        {/* Mostrar el resultado si está seteado */}
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

