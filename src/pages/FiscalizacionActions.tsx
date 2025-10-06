import { IonContent, IonItem, IonLabel } from '@ionic/react';
import Layout from '../components/Layout';
import { Button } from '../components';
import {
  getFiscalAssignmentDetails,
  getMemberNameParts,
  useFiscalData,
} from '../FiscalDataContext';
import type { FiscalData } from '../FiscalDataContext';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Camera, CameraResultType } from '@capacitor/camera';
import type { ChangeEvent } from 'react';

// ==== Tipos auxiliares para leer el shape real que llega del API ====
type FDAsignado = { nombre?: string; mesas?: Array<{ numero?: string | number }> };
type FDEstablecimiento = { direccion?: string };
type FDShape = {
  f_g_asignado?: FDAsignado;
  establecimiento_fiscalizacion?: FDEstablecimiento;
  nombre_establecimiento?: string;
  establecimiento?: string;
  lugar?: string;
  direccion_establecimiento?: string;
  direccion?: string;
  mesa?: string | number;
};

// helper local: string recortado o undefined
const str = (v: unknown): string | undefined =>
  typeof v === 'string' ? (v.trim() ? v.trim() : undefined) : undefined;

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

  const {
    mesa: mesaAsignadaDesdeData,
    lugar: lugarAsignadoDesdeData,
    establecimiento: establecimientoDesdeData,
    direccion: direccionDesdeData,
    fiscalGeneral,
  } = useMemo(() => getFiscalAssignmentDetails(fiscalData ?? undefined), [fiscalData]);

  const readStoredAssignmentValue = useCallback(
    (keys: string[], preferredNestedKeys: readonly string[]): string | undefined => {
      for (const key of keys) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;

        const trimmed = raw.trim();
        if (!trimmed) continue;

        try {
          const parsed = JSON.parse(trimmed);
          if (typeof parsed === 'string') {
            const value = parsed.trim();
            if (value) return value;
          } else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const parsedRecord = parsed as Record<string, unknown>;
            for (const nestedKey of preferredNestedKeys) {
              const value = parsedRecord[nestedKey];
              if (typeof value === 'string') {
                const nestedTrimmed = value.trim();
                if (nestedTrimmed) return nestedTrimmed;
              }
            }
            for (const value of Object.values(parsedRecord)) {
              if (typeof value === 'string') {
                const nestedTrimmed = value.trim();
                if (nestedTrimmed) return nestedTrimmed;
              }
            }
          }
        } catch {
          // Not JSON -> devolvemos el string crudo
        }

        return trimmed;
      }
      return undefined;
    },
    [],
  );

  const mesaAsignada = useMemo(() => {
    if (mesaAsignadaDesdeData) return mesaAsignadaDesdeData;
    if (typeof window === 'undefined') return undefined;
    const storedMesa = localStorage.getItem('mesa');
    return storedMesa?.trim() ? storedMesa.trim() : undefined;
  }, [mesaAsignadaDesdeData]);

  // === PRIORIDAD: datos reales del JSON; luego fallbacks ===
  const establecimientoAsignado = useMemo(() => {
    if (establecimientoDesdeData) return establecimientoDesdeData;

    const fd = fiscalData as unknown as FDShape | undefined;
    const nombre =
      str(fd?.f_g_asignado?.nombre) ??
      str(fd?.nombre_establecimiento) ??
      str(fd?.establecimiento) ??
      str(fd?.lugar);

    if (nombre) return nombre;

    if (typeof window === 'undefined') return undefined;
    return readStoredAssignmentValue(
      [
        'nombre_establecimiento',
        'nombreEstablecimiento',
        'nombre_establecimiento_fiscalizacion',
        'establecimiento_fiscalizacion',
        'nombre_escuela',
        'nombreEscuela',
        'escuela',
        'establecimiento',
        'lugar',
      ],
      ['nombre', 'name', 'descripcion', 'description', 'lugar'],
    );
  }, [establecimientoDesdeData, fiscalData, readStoredAssignmentValue]);

  const direccionAsignada = useMemo(() => {
    if (direccionDesdeData) return direccionDesdeData;

    const fd = fiscalData as unknown as FDShape | undefined;
    const dir =
      str(fd?.establecimiento_fiscalizacion?.direccion) ??
      str(fd?.direccion_establecimiento) ??
      str(fd?.direccion);

    if (dir) return dir;

    if (typeof window === 'undefined') return undefined;

    const fallback = readStoredAssignmentValue(
      [
        'direccion_establecimiento',
        'direccionEstablecimiento',
        'direccion_establecimiento_fiscalizacion',
        'establecimiento_fiscalizacion',
        'direccion_escuela',
        'direccionEscuela',
        'direccion',
        'domicilio',
        'ubicacion',
        'establecimiento',
      ],
      ['direccion', 'domicilio', 'ubicacion', 'address', 'calle'],
    );
    if (fallback) return fallback;

    const seccion = localStorage.getItem('seccion')?.trim();
    const circuito = localStorage.getItem('circuito')?.trim();
    const parts = [seccion ? `Sección ${seccion}` : null, circuito ? `Circuito ${circuito}` : null]
      .filter(Boolean)
      .join(' · ');
    return parts || undefined;
  }, [direccionDesdeData, fiscalData, readStoredAssignmentValue]);

  const lugarAsignado = useMemo(() => {
    if (lugarAsignadoDesdeData) return lugarAsignadoDesdeData;
    if (typeof window === 'undefined') return undefined;
    const storedLugar = localStorage.getItem('lugar');
    if (storedLugar?.trim()) return storedLugar.trim();
    return establecimientoAsignado || undefined;
  }, [establecimientoAsignado, lugarAsignadoDesdeData]);

  const metadataLabelClass = 'text-sm text-gray-600';
  const metadataValueClass = 'font-medium text-gray-700';

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
              {memberType && (
                <p className={metadataLabelClass}>
                  Tipo de fiscal:{' '}
                  <span className={metadataValueClass}>{memberType}</span>
                </p>
              )}
              {mesaAsignada && (
                <p className={metadataLabelClass}>
                  Mesa: <span className={metadataValueClass}>{mesaAsignada}</span>
                </p>
              )}
              {establecimientoAsignado && (
                <p className={metadataLabelClass}>
                  Escuela:{' '}
                  <span className={metadataValueClass}>{establecimientoAsignado}</span>
                </p>
              )}
              {direccionAsignada && (
                <p className={metadataLabelClass}>
                  Dirección: <span className={metadataValueClass}>{direccionAsignada}</span>
                </p>
              )}
              {lugarAsignado && (!establecimientoAsignado || lugarAsignado !== establecimientoAsignado) && (
                <p className={metadataLabelClass}>
                  Lugar: <span className={metadataValueClass}>{lugarAsignado}</span>
                </p>
              )}
              {memberZone && (
                <p className={metadataLabelClass}>
                  Zona: <span className={metadataValueClass}>{memberZone}</span>
                </p>
              )}
              {fiscalGeneral && (
                <p className={metadataLabelClass}>
                  Fiscal general:{' '}
                  <span className={metadataValueClass}>{fiscalGeneral}</span>
                </p>
              )}
              {(establecimientoAsignado || direccionAsignada) && (
                <p className="text-xs italic text-gray-500 mt-2">
                  Sugerencia: agregá un mapa del establecimiento para facilitar la ubicación en el territorio.
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
