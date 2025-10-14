import { IonContent, IonItem, IonLabel, IonModal } from '@ionic/react';
import Layout from '../components/Layout';
import { Button, Input } from '../components';
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
import { useAuth } from '../AuthContext';
import type { CSSProperties } from 'react';

const labelStyle: CSSProperties = { display: 'block', marginBottom: 10 };
const inputStyle: CSSProperties = { marginTop: 8, width: '100%' };
const itemStyle: CSSProperties = {
  ['--inner-padding-top' as unknown as string]: '10px',
  ['--inner-padding-bottom' as unknown as string]: '10px',
};

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

// === Tipos para coords del API (sin any) ===
type GeoPoint = { lat?: number | string; lng?: number | string };
type FiscalDataGeo = FiscalData & {
  ubicacion?: GeoPoint;
  establecimiento_fiscalizacion?: { direccion?: string; ubicacion?: GeoPoint };
};

// number seguro desde string|number|otro
const toNumber = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

type MemberNameParts = ReturnType<typeof getMemberNameParts>;

type EstablecimientoFormState = {
  seccion: string;
  circuito: string;
  mesa: string;
  nombre: string;
};

// helper: Blob -> dataURL para preview
const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });

const FiscalizacionActions: React.FC = () => {
  const history = useHistory();
  const { fiscalData, hasFiscalData, setFiscalData } = useFiscalData();

  // FOTO: ahora guardamos el BLOB real + un dataURL para el <img/>
  const [fotoBlob, setFotoBlob] = useState<Blob | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string>(localStorage.getItem('fotoActa') || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const memberNameParts: MemberNameParts = useMemo(
    () => getMemberNameParts(fiscalData ?? undefined),
    [fiscalData],
  );

  const memberName = useMemo(() => {
    const { apellidos, nombres, displayName } = memberNameParts;
    if (displayName) return displayName;
    if (apellidos && nombres) return `${apellidos}, ${nombres}`;
    return apellidos || nombres || '';
  }, [memberNameParts]);

  const memberType = useMemo(() => {
    if (!fiscalData) return '';
    const potentialValues = [fiscalData.nombre_tipo_miembro, fiscalData.tipo_fiscal];
    for (const value of potentialValues) {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) return trimmed;
      }
    }
    return '';
  }, [fiscalData]);

  const isFiscalZonal = useMemo(
    () => !!memberType && memberType.trim().toUpperCase() === 'FISCAL ZONAL',
    [memberType],
  );

  const zonaEleccionNombre = useMemo(() => {
    if (!fiscalData) return undefined;
    const zonaEleccion = (fiscalData as Record<string, unknown>)['zonaEleccion'];
    if (zonaEleccion && typeof zonaEleccion === 'object' && !Array.isArray(zonaEleccion)) {
      const zonaRecord = zonaEleccion as Record<string, unknown>;
      return (
        str(zonaRecord['nombre']) ||
        str(zonaRecord['descripcion']) ||
        (() => {
          const numero = zonaRecord['numero'];
          if (typeof numero === 'number' || typeof numero === 'string') {
            const formatted = `${numero}`.trim();
            return formatted || undefined;
          }
          return undefined;
        })()
      );
    }
    return undefined;
  }, [fiscalData]);

  const memberZone = useMemo(() => {
    if (!fiscalData) return '';
    const value = typeof fiscalData.nombre_zona === 'string' ? fiscalData.nombre_zona.trim() : '';
    return value;
  }, [fiscalData]);

  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [establecimientoForm, setEstablecimientoForm] = useState<EstablecimientoFormState>({
    seccion: '',
    circuito: '',
    mesa: '',
    nombre: '',
  });
  const [isSendingPhoto, setIsSendingPhoto] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  const fechaEnvio = new Date().toISOString();
  const fileDescriptor = 'archivo subido (acta.jpg)';

  const personaRecord = useMemo(() => {
    if (!fiscalData) return undefined;
    const record = fiscalData as unknown as Record<string, unknown>;
    const nested = record['persona'];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return nested as Record<string, unknown>;
    }
    return undefined;
  }, [fiscalData]);

  const personaDni = useMemo(() => {
    const fiscalRecord = (fiscalData ?? undefined) as Record<string, unknown> | undefined;
    const candidates: unknown[] = [
      user?.dni,
      fiscalRecord?.['dni_miembro'],
      fiscalRecord?.['dni'],
      personaRecord?.['dni'],
      personaRecord?.['documento'],
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'number' || typeof candidate === 'string') {
        const asString = `${candidate}`.trim();
        if (asString) return asString;
      }
    }
    return '';
  }, [fiscalData, personaRecord, user]);

  const personaEmail = useMemo(() => {
    const fiscalRecord = (fiscalData ?? undefined) as Record<string, unknown> | undefined;
    const candidates: unknown[] = [
      user?.email,
      fiscalRecord?.['email'],
      fiscalRecord?.['correo'],
      fiscalRecord?.['mail'],
      personaRecord?.['email'],
      personaRecord?.['correo'],
      personaRecord?.['mail'],
    ];
    for (const candidate of candidates) {
      const value = str(candidate);
      if (value) return value;
    }
    return '';
  }, [fiscalData, personaRecord, user]);

  const personaPayload = useMemo(
    () => ({
      dni: personaDni,
      nombre: memberNameParts.nombres ?? '',
      apellido: memberNameParts.apellidos ?? '',
      email: personaEmail ?? '',
    }),
    [memberNameParts, personaDni, personaEmail],
  );

  const {
    mesa: mesaAsignadaDesdeData,
    lugar: lugarAsignadoDesdeData,
    establecimiento: establecimientoDesdeData,
    direccion: direccionDesdeData,
    fiscalGeneral,
  } = useMemo(() => getFiscalAssignmentDetails(fiscalData ?? undefined), [fiscalData]);
  console.log('Detalles de asignación fiscal:', {
    mesa: mesaAsignadaDesdeData,
    lugar: lugarAsignadoDesdeData,
    establecimiento: establecimientoDesdeData,
    direccion: direccionDesdeData,    
  }); 
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
          return trimmed;
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
    const storedMesa = localStorage.getItem('mesa_nro');
    return storedMesa?.trim() ? storedMesa.trim() : undefined;
  }, [mesaAsignadaDesdeData]);

  const establecimientoAsignado = useMemo(() => {
    if (establecimientoDesdeData) return establecimientoDesdeData;
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
  }, [establecimientoDesdeData, readStoredAssignmentValue]);

  const direccionAsignada = useMemo(() => {
    if (direccionDesdeData) return direccionDesdeData;
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
  }, [direccionDesdeData, readStoredAssignmentValue]);

  const lugarAsignado = useMemo(() => {
    if (lugarAsignadoDesdeData) return lugarAsignadoDesdeData;
    if (typeof window === 'undefined') return undefined;
    const storedLugar = localStorage.getItem('lugar');
    if (storedLugar?.trim()) return storedLugar.trim();
    return establecimientoAsignado || undefined;
  }, [establecimientoAsignado, lugarAsignadoDesdeData]);

  const handleOpenModal = () => {
    const storedSeccion = localStorage.getItem('seccion')?.trim() ?? '';
    const storedCircuito = localStorage.getItem('circuito')?.trim() ?? '';
    setEstablecimientoForm({
      seccion: storedSeccion,
      circuito: storedCircuito,
      mesa: mesaAsignada ?? '',
      nombre: establecimientoAsignado ?? '',
    });
    setSendError(null);
    setSendSuccess(false);
    setShowPhotoModal(true);
  };

  const handleCloseModal = () => {
    if (isSendingPhoto) return;
    setShowPhotoModal(false);
  };

  // === enviarFoto: ahora usa FormData con clave 'file' ===
  const enviarFoto = useCallback(async () => {
    if (!fotoBlob) {
      setSendError('Debes tomar o subir una foto antes de enviarla.');
      return;
    }

    const establecimientoPayload = {
      seccion: establecimientoForm.seccion.trim(),
      circuito: establecimientoForm.circuito.trim(),
      mesa: establecimientoForm.mesa.trim(),
      nombre: establecimientoForm.nombre.trim(),
    };

    const fd = new FormData();
    fd.append('file', fotoBlob, 'acta.jpg'); // clave EXACTA que espera el backend
    fd.append('fecha', fechaEnvio);
    fd.append('establecimiento', JSON.stringify(establecimientoPayload));
    fd.append('persona', JSON.stringify(personaPayload));
    console.log('Payload para envío de foto:', fd);
    try {
      setIsSendingPhoto(true);
      setSendError(null);

      const raw = localStorage.getItem('token') || '';
      console.log('Token para auth:', raw);
   
      
      const response = await fetch(
        'https://api.lalibertadavanzacomuna7.com/api/actasFoto/enviar-foto',
        {
          method: 'POST',
          headers: {
            // NO seteamos Content-Type; el navegador lo arma con boundary
            Accept: 'application/json',
            Authorization: raw,
          },
          body: fd,
        },
      );

      if (!response.ok) {
        let msg = response.statusText;
        try {
          const j = await response.json();
          msg = j?.mensaje || j?.message || msg;
        } catch {
          msg = (await response.text()) || msg;
        }
        throw new Error(`No se pudo enviar la foto (${response.status}): ${msg}`);
      }

      setSendSuccess(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido al enviar la foto.';
      setSendError(message);
      setSendSuccess(false);
    } finally {
      setIsSendingPhoto(false);
    }
  }, [establecimientoForm, fechaEnvio, fotoBlob, personaPayload]);

  const handleConfirmModal = () => {
    if (sendSuccess) {
      setShowPhotoModal(false);
      return;
    }
    void enviarFoto();
  };

  const metadataLabelClass = 'text-sm text-gray-600';
  const metadataValueClass = 'font-medium text-gray-700';

  // Tomar foto con Camera -> Blob real + preview
  const handleFoto = async () => {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri, // URI -> podemos fetchear el Blob real
        quality: 80,
      });
      if (photo.webPath) {
        const blob = await fetch(photo.webPath).then((r) => r.blob());
        setFotoBlob(blob);
        const preview = await blobToDataUrl(blob);
        setFotoPreview(preview);
        localStorage.setItem('fotoActa', preview);
      }
    } catch {
      fileInputRef.current?.click();
    }
  };

  // File input -> usamos File (Blob) y generamos preview
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoBlob(file);
    const preview = await blobToDataUrl(file);
    setFotoPreview(preview);
    localStorage.setItem('fotoActa', preview);
  };

  const coords = useMemo<{ lat: number; lng: number } | undefined>(() => {
    const fd = (fiscalData as unknown as FiscalDataGeo) || null;
    if (!fd) return undefined;
    const u = fd.ubicacion ?? fd.establecimiento_fiscalizacion?.ubicacion;
    const lat = toNumber(u?.lat);
    const lng = toNumber(u?.lng);
    return lat !== undefined && lng !== undefined ? { lat, lng } : undefined;
  }, [fiscalData]);

  const mapsQuery = useMemo<string | undefined>(() => {
    if (coords) return `${coords.lat},${coords.lng}`;
    return undefined;
  }, [coords]);

  const SHOW_DEBUG = false;

  const ionItemStyle: CSSProperties = {
    ['--inner-padding-top' as unknown as string]: '12px',
    ['--inner-padding-bottom' as unknown as string]: '12px',
    ['--min-height' as unknown as string]: '64px',
    borderRadius: '8px',
  };

  const handleClearFoto = () => {
    setFotoBlob(null);
    setFotoPreview('');
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
                  Tipo de fiscal: <span className={metadataValueClass}>{memberType}</span>
                </p>
              )}
              {mesaAsignada && (
                <p className={metadataLabelClass}>
                  Mesa: <span className={metadataValueClass}>{mesaAsignada}</span>
                </p>
              )}
              {establecimientoAsignado && (
                <p className={metadataLabelClass}>
                  Escuela: <span className={metadataValueClass}>{establecimientoAsignado}</span>
                </p>
              )}
              {isFiscalZonal && zonaEleccionNombre && (
                <p className={metadataLabelClass}>
                  Zona de elección: <span className={metadataValueClass}>{zonaEleccionNombre}</span>
                </p>
              )}
              {!isFiscalZonal && direccionAsignada && (
                <p className={metadataLabelClass}>
                  Dirección: <span className={metadataValueClass}>{direccionAsignada}</span>
                </p>
              )}
              {lugarAsignado &&
                (!establecimientoAsignado || lugarAsignado !== establecimientoAsignado) && (
                  <p className={metadataLabelClass}>
                    Lugar: <span className={metadataValueClass}>{lugarAsignado}</span>
                  </p>
                )}
              {memberZone && (
                <p className={metadataLabelClass}>
                  Zona: <span className={metadataValueClass}>{memberZone}</span>
                </p>
              )}
            </IonLabel>
          </IonItem>
        )}

        {coords && (
          <IonItem lines="none" className="ion-margin-bottom rounded-lg overflow-hidden">
            <IonLabel>
              <p className="text-sm text-gray-600 mb-2">Mapa del establecimiento</p>
              <div className="w-full" style={{ height: 240, borderRadius: 8, overflow: 'hidden' }}>
                <iframe
                  title="Mapa"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={
                    mapsQuery
                      ? `https://www.google.com/maps?q=${mapsQuery}&z=16&output=embed`
                      : ''
                  }
                />
              </div>
              {mapsQuery && (
                <a
                  className="text-sm text-blue-600 underline mt-2 inline-block"
                  href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir en Google Maps
                </a>
              )}
            </IonLabel>
          </IonItem>
        )}

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

          {fotoPreview && (
            <div className="flex flex-col items-center w-4/5">
              <img src={fotoPreview} alt="Foto del acta" className="max-w-xs mt-2 rounded shadow " />
              <Button size="small" color="danger" className="mt-2 w-4/5" onClick={handleClearFoto}>
                Borrar foto
              </Button>
              <Button
                size="small"
                color="success"
                className="mt-2 w-4/5"
                disabled={!fotoBlob || isSendingPhoto}
                onClick={handleOpenModal}
              >
                Enviar foto
              </Button>
            </div>
          )}

          <Button routerLink="/voters" className="flex flex-col items-center w-4/5">
            Votación
          </Button>
          <Button routerLink="/escrutinio" className="flex flex-col items-center w-4/5">
            Escrutinio
          </Button>
        </div>
      </IonContent>

      <IonModal
        isOpen={showPhotoModal}
        onDidDismiss={handleCloseModal}
        backdropDismiss={!isSendingPhoto}
      >
        <IonContent className="ion-padding">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Confirmar envío de foto</h2>
            <div>
              <p className="text-sm text-gray-600">Archivo</p>
              <p className="text-base text-gray-800 font-medium">{fileDescriptor}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Establecimiento</p>
              <div className="space-y-3">
                <IonItem lines="full" style={itemStyle}>
                  <IonLabel position="stacked" style={labelStyle}>
                    Sección
                  </IonLabel>
                  <Input
                    value={establecimientoForm.seccion}
                    onIonChange={(e) =>
                      setEstablecimientoForm((prev) => ({
                        ...prev,
                        seccion: e.detail.value ?? '',
                      }))
                    }
                  />
                </IonItem>
                <IonItem lines="full" style={labelStyle}>
                  <IonLabel position="stacked" style={labelStyle}>
                    Circuito
                  </IonLabel>
                  <Input
                    value={establecimientoForm.circuito}
                    onIonChange={(e) =>
                      setEstablecimientoForm((prev) => ({
                        ...prev,
                        circuito: e.detail.value ?? '',
                      }))
                    }
                  />
                </IonItem>
                <IonItem lines="full" style={labelStyle}>
                  <div className="mt-2 w-full">
                    <IonLabel position="stacked" style={labelStyle}>
                      Mesa
                    </IonLabel>
                    <Input
                      value={establecimientoForm.mesa}
                      onIonChange={(e) =>
                        setEstablecimientoForm((prev) => ({
                          ...prev,
                          mesa: e.detail.value ?? '',
                        }))
                      }
                    />
                  </div>
                </IonItem>
                <IonItem lines="full" style={labelStyle}>
                  <IonLabel position="stacked" style={labelStyle}>
                    Nombre
                  </IonLabel>
                  <Input
                    value={establecimientoForm.nombre}
                    onIonChange={(e) =>
                      setEstablecimientoForm((prev) => ({
                        ...prev,
                        nombre: e.detail.value ?? '',
                      }))
                    }
                  />
                </IonItem>
              </div>
            </div>
            {sendError && <p className="text-sm text-red-600">{sendError}</p>}
            {sendSuccess && (
              <p className="text-sm text-green-600">Foto enviada correctamente.</p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button color="medium" fill="outline" onClick={handleCloseModal} disabled={isSendingPhoto}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmModal} disabled={isSendingPhoto}>
                {sendSuccess ? 'Cerrar' : isSendingPhoto ? 'Enviando...' : 'Confirmar envío'}
              </Button>
            </div>
          </div>
        </IonContent>
      </IonModal>
    </Layout>
  );
};

export default FiscalizacionActions;
