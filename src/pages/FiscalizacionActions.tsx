import { IonContent, IonItem, IonLabel } from '@ionic/react';
import Layout from '../components/Layout';
import { Button } from '../components';
import { getMemberNameParts, useFiscalData } from '../FiscalDataContext';
import type { FiscalData } from '../FiscalDataContext';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Camera, CameraResultType } from '@capacitor/camera';
import type { ChangeEvent } from 'react';

const FiscalizacionActions: React.FC = () => {
  const history = useHistory();
  const { fiscalData, hasFiscalData, setFiscalData } = useFiscalData();
  const [foto, setFoto] = useState<string>(localStorage.getItem('fotoActa') || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const memberName = useMemo(() => {
    if (!fiscalData) return '';
    const { apellidos, nombres, displayName } = getMemberNameParts(fiscalData);
    if (displayName) return displayName;
    if (apellidos && nombres) return `${apellidos}, ${nombres}`;
    return apellidos || nombres || '';
  }, [fiscalData]);

  const memberType = useMemo(() => {
    if (!fiscalData) return '';
    const value =
      typeof fiscalData.nombre_tipo_miembro === 'string'
        ? fiscalData.nombre_tipo_miembro.trim()
        : '';
    return value;
  }, [fiscalData]);

  const memberZone = useMemo(() => {
    if (!fiscalData) return '';
    const value = typeof fiscalData.nombre_zona === 'string' ? fiscalData.nombre_zona.trim() : '';
    return value;
  }, [fiscalData]);

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
        {fiscalData && (
          <IonItem lines="none" className="ion-margin-bottom rounded-lg bg-gray-100">
            <IonLabel>
              <h2 className="font-semibold text-base">Fiscal asignado</h2>
              {memberName && <p className="text-sm">{memberName}</p>}
              {memberType && <p className="text-sm text-gray-600">{memberType}</p>}
              {memberZone && (
                <p className="text-sm text-gray-600">
                  Zona: <span className="font-medium text-gray-700">{memberZone}</span>
                </p>
              )}
            </IonLabel>
          </IonItem>
        )}
        <IonItem>
          <IonLabel position="stacked">Foto del acta</IonLabel>

        </IonItem>
        <div className="flex flex-col items-center gap-4  w-4/5 mx-auto mt-4">
          <Button onClick={handleFoto} className="flex flex-col items-center w-4/5">
            Tomar/Subir Foto
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            title="Subir foto del acta"
          />
          {foto && (
            <div className="flex flex-col items-center w-4/5">
              <img src={foto} alt="Foto del acta" className="max-w-xs mt-2 rounded shadow " />
              <Button size="small" color="danger" className="mt-2 w-4/5" onClick={handleClearFoto}>
                Borrar foto
              </Button>
            </div>
          )}
          <Button routerLink="/voters" className="flex flex-col items-center w-4/5">Votación</Button>
          <Button routerLink="/escrutinio" className="flex flex-col items-center w-4/5">Escrutinio</Button>
        </div>
      </IonContent>
    </Layout>
  );
};

export default FiscalizacionActions;
