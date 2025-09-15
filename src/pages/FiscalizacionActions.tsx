import { IonContent, IonItem, IonLabel } from '@ionic/react';
import Layout from '../components/Layout';
import { Button } from '../components';
import { useFiscalData } from '../FiscalDataContext';
import type { FiscalData } from '../FiscalDataContext';
import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { Camera, CameraResultType } from '@capacitor/camera';

const FiscalizacionActions: React.FC = () => {
  const history = useHistory();
  const { hasFiscalData, setFiscalData } = useFiscalData();
  const [foto, setFoto] = useState<string>(localStorage.getItem('fotoActa') || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFoto = async () => {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        quality: 80,
      });
      if (photo.dataUrl) {
        setFoto(photo.dataUrl);
        localStorage.setItem('fotoActa', photo.dataUrl);
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
      const dataUrl = reader.result as string;
      setFoto(dataUrl);
      localStorage.setItem('fotoActa', dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleClearFoto = () => {
    setFoto('');
    localStorage.removeItem('fotoActa');
  };

  useEffect(() => {
    if (!hasFiscalData) {
      const stored = localStorage.getItem('fiscalData');
      if (stored) {
        try {
          setFiscalData(JSON.parse(stored) as FiscalData);
        } catch {
          history.replace('/fiscalizacion-lookup');
        }
      } else {
        history.replace('/fiscalizacion-lookup');
      }
    }
  }, [hasFiscalData, history, setFiscalData]);

  return (
    <Layout backHref="/fiscalizacion-lookup">
      <IonContent className="ion-padding">
        <IonItem>
          <IonLabel position="stacked">Foto del acta</IonLabel>
          <Button onClick={handleFoto}>Tomar/Subir Foto</Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            title="Subir foto del acta"
          />
          {foto && (
            <div className="flex flex-col items-center">
              <img src={foto} alt="Foto del acta" className="max-w-xs mt-2 rounded shadow" />
              <Button size="small" color="danger" className="mt-2" onClick={handleClearFoto}>
                Borrar foto
              </Button>
            </div>
          )}
        </IonItem>
        <div className="flex flex-col items-center 1gap-4 mt-4">
          <Button routerLink="/voters" className="w-4/5">Votación</Button>
          <Button routerLink="/escrutinio" className="w-4/5">Escrutinio</Button>
        </div>
      </IonContent>
    </Layout>
  );
};

export default FiscalizacionActions;
