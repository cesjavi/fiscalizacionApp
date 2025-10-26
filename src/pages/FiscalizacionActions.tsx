import {
  IonContent,
  IonItem,
  IonLabel,
  IonModal,
  IonSelect,
  IonSelectOption,
} from '@ionic/react';
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
import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import type { ChangeEvent } from 'react';
import { useAuth } from '../AuthContext';
import type { CSSProperties } from 'react';

const labelStyle: CSSProperties = { display: 'block', marginBottom: 10 };
const inputStyle: CSSProperties = { marginTop: 8, width: '100%' };
const itemStyle: CSSProperties = {
  ['--inner-padding-top' as unknown as string]: '10px',
  ['--inner-padding-bottom' as unknown as string]: '10px',
};

type GeoPoint = { lat?: number | string; lng?: number | string };
type FiscalDataGeo = FiscalData & {
  ubicacion?: GeoPoint;
  establecimiento_fiscalizacion?: { direccion?: string; ubicacion?: GeoPoint };
};

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

type FiscalMesaCard = {
  id: string;
  nombre?: string;
  telefono?: string;
  mesa?: string;
  isMesaTestigo?: boolean;
};

type MesaResumen = {
  id: string;
  numero?: string;
  fiscales?: string[];
  esMesaTestigo?: boolean;
};

type EstablecimientoCard = {
  id: string;
  nombre?: string;
  direccion?: string;
  mapsQuery?: string;
  mapsUrl?: string;
  fiscalGeneral?: string;
  telefono?: string;
  fiscalesGenerales?: RoleContact[];
  mesas?: MesaResumen[];
};

type MesasModalGroup = {
  establecimiento: EstablecimientoCard;
  mesas: MesaResumen[];
};

type MesasModalState = {
  title: string;
  groups: MesasModalGroup[];
  emptyMessage: string;
  noGroupsMessage?: string;
};

type RoleContact = {
  nombre?: string;
  telefono?: string;
};

const sortMesas = (mesas: MesaResumen[]): MesaResumen[] =>
  [...mesas].sort((a, b) => {
    const aNum = a.numero ?? '';
    const bNum = b.numero ?? '';
    return aNum.localeCompare(bNum, undefined, { numeric: true, sensitivity: 'base' });
  });

const mergeRoleContacts = (
  existing?: RoleContact[],
  incoming?: RoleContact[],
): RoleContact[] | undefined => {
  if ((!existing || existing.length === 0) && (!incoming || incoming.length === 0)) {
    return undefined;
  }

  const byKey = new Map<string, RoleContact>();

  const addContact = (contact?: RoleContact) => {
    if (!contact) return;
    const nombre = contact.nombre?.trim();
    const telefono = contact.telefono?.trim();
    if (!nombre && !telefono) return;

    const key = `${nombre ?? ''}|${telefono ?? ''}`.toLowerCase();
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, { nombre, telefono });
      return;
    }

    byKey.set(key, {
      nombre: prev.nombre ?? nombre,
      telefono: prev.telefono ?? telefono,
    });
  };

  (existing ?? []).forEach(addContact);
  (incoming ?? []).forEach(addContact);

  return byKey.size > 0 ? Array.from(byKey.values()) : undefined;
};

const mergeMesasResumen = (
  existing?: MesaResumen[],
  incoming?: MesaResumen[],
): MesaResumen[] | undefined => {
  if ((!existing || existing.length === 0) && (!incoming || incoming.length === 0)) {
    return undefined;
  }

  const mesas = new Map<string, MesaResumen>();

  const addMesa = (mesa?: MesaResumen) => {
    if (!mesa) return;
    const key = (mesa.numero ?? mesa.id).toString().toLowerCase();
    const current = mesas.get(key);

    if (!current) {
      mesas.set(key, {
        ...mesa,
        fiscales: mesa.fiscales ? [...mesa.fiscales] : undefined,
      });
      return;
    }

    const fiscales = new Set<string>();
    (current.fiscales ?? []).forEach((f) => {
      if (f.trim()) fiscales.add(f.trim());
    });
    (mesa.fiscales ?? []).forEach((f) => {
      if (f.trim()) fiscales.add(f.trim());
    });

    mesas.set(key, {
      ...current,
      ...mesa,
      esMesaTestigo: Boolean(current.esMesaTestigo || mesa.esMesaTestigo),
      fiscales: fiscales.size > 0 ? Array.from(fiscales) : undefined,
    });
  };

  (existing ?? []).forEach(addMesa);
  (incoming ?? []).forEach(addMesa);

  if (mesas.size === 0) return undefined;

  return sortMesas(Array.from(mesas.values()));
};

const mergeEstablecimientoCard = (
  existing: EstablecimientoCard,
  incoming: Omit<EstablecimientoCard, 'id'>,
): EstablecimientoCard => ({
  ...existing,
  nombre: existing.nombre ?? incoming.nombre,
  direccion: existing.direccion ?? incoming.direccion,
  mapsQuery: existing.mapsQuery ?? incoming.mapsQuery,
  mapsUrl: existing.mapsUrl ?? incoming.mapsUrl,
  fiscalGeneral: existing.fiscalGeneral ?? incoming.fiscalGeneral,
  telefono: existing.telefono ?? incoming.telefono,
  fiscalesGenerales: mergeRoleContacts(existing.fiscalesGenerales, incoming.fiscalesGenerales),
  mesas: mergeMesasResumen(existing.mesas, incoming.mesas),
});

type MesaSummaryAccumulator = {
  numero?: string;
  esMesaTestigo: boolean;
  fiscales: Set<string>;
};

const sanitizeMesas = (mesas?: MesaResumen[]): MesaResumen[] =>
  (mesas ?? [])
    .map((mesa) => ({
      ...mesa,
      numero: typeof mesa.numero === 'string' ? mesa.numero.trim() || undefined : mesa.numero,
      fiscales:
        Array.isArray(mesa.fiscales) && mesa.fiscales.length > 0
          ? Array.from(new Set(mesa.fiscales.map((f) => f.trim()).filter(Boolean)))
          : undefined,
    }))
    .filter((mesa) => {
      const hasNumero = typeof mesa.numero === 'string' ? mesa.numero.trim().length > 0 : Boolean(mesa.numero);
      const hasFiscales = Array.isArray(mesa.fiscales) && mesa.fiscales.length > 0;
      return hasNumero || hasFiscales;
    });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const str = (v: unknown): string | undefined =>
  typeof v === 'string' ? (v.trim() ? v.trim() : undefined) : undefined;

const asString = (value: unknown): string | undefined => {
  if (typeof value === 'string' || typeof value === 'number') {
    const text = `${value}`.trim();
    return text || undefined;
  }
  return undefined;
};

const PHONE_KEYS = [
  'celular_miembro',
  'telefono_miembro',
  'telefono',
  'celular',
  'telefono_contacto',
  'tel',
  'movil',
  'whatsapp',
  'phone',
] as const;

const ESTABLECIMIENTO_NAME_KEYS = [
  'nombre_establecimiento',
  'nombre_establecimiento_fiscalizacion',
  'nombre',
  'escuela',
  'establecimiento',
  'lugar',
] as const;

const DIRECCION_KEYS = [
  'direccion_establecimiento',
  'direccion',
  'domicilio',
  'ubicacion',
  'address',
] as const;

const TESTIGO_KEYS = ['testigo', 'es_mesa_testigo', 'mesaTestigo'] as const;

const stringFromKeys = (
  record: Record<string, unknown>,
  keys: readonly string[],
): string | undefined => {
  for (const key of keys) {
    if (!(key in record)) continue;
    const value = asString(record[key]);
    if (value) return value;
  }
  return undefined;
};

const extractIsMesaTestigo = (record: Record<string, unknown>): boolean => {
  for (const key of TESTIGO_KEYS) {
    if (key in record) {
      const value = record[key];
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string' && value.toLowerCase().includes('testigo')) return true;
    }
  }
  return false;
};

const extractCoords = (
  value: unknown,
  visited: Set<unknown> = new Set(),
): { lat: number; lng: number } | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'object') return undefined;
  if (visited.has(value)) return undefined;
  visited.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = extractCoords(item, visited);
      if (nested) return nested;
    }
    return undefined;
  }

  if (!isRecord(value)) return undefined;

  const lat = toNumber(value['lat'] ?? value['latitude'] ?? value['latitud']);
  const lng = toNumber(value['lng'] ?? value['lon'] ?? value['longitude'] ?? value['longitud']);

  if (lat !== undefined && lng !== undefined) {
    return { lat, lng };
  }

  if (isRecord(value)) {
    for (const nested of Object.values(value)) {
      const coords = extractCoords(nested, visited);
      if (coords) return coords;
    }
  }

  return undefined;
};

const collectMesaSummaries = (
  value: unknown,
  results: Map<string, MesaSummaryAccumulator>,
  visited: Set<unknown>,
) => {
  if (value === null || value === undefined) return;

  if (Array.isArray(value)) {
    value.forEach((item) => collectMesaSummaries(item, results, visited));
    return;
  }

  if (typeof value !== 'object') return;
  if (visited.has(value)) return;
  visited.add(value);

  const record = value as Record<string, unknown>;
  
  const numeroRaw = record['numero'];
  if (!numeroRaw) return;
  
  const numero = `${numeroRaw}`.trim();
  if (!numero || !/^\d{4}$/.test(numero)) return;

  const esMesaTestigo = extractIsMesaTestigo(record);

  const fiscalesInfo = new Set<string>();
  const fmAsignado = record['fm_asignado'];
  
  if (Array.isArray(fmAsignado)) {
    fmAsignado.forEach((fiscal) => {
      if (!fiscal || typeof fiscal !== 'object') return;
      const fiscalRecord = fiscal as Record<string, unknown>;
      
      const apellidos = fiscalRecord['apellidos_miembro'] || fiscalRecord['apellidos'];
      const nombres = fiscalRecord['nombres_miembro'] || fiscalRecord['nombres'];
      const telefono = stringFromKeys(fiscalRecord, PHONE_KEYS);
      
      let info = '';
      
      if (apellidos && nombres) {
        info = `${apellidos}, ${nombres}`;
      } else if (apellidos || nombres) {
        info = `${apellidos || nombres}`;
      }
      
      if (telefono) {
        if (info) {
          info += ` • ${telefono}`;
        } else {
          info = telefono;
        }
      }
      
      if (info) {
        fiscalesInfo.add(info.trim());
      }
    });
  }

  const mapKey = numero.toLowerCase();
  const existing = results.get(mapKey) ?? {
    numero,
    esMesaTestigo: false,
    fiscales: new Set<string>(),
  };
  
  if (esMesaTestigo) existing.esMesaTestigo = true;
  fiscalesInfo.forEach((info) => existing.fiscales.add(info));
  results.set(mapKey, existing);
};

const buildEstablecimientoCard = (
  record: Record<string, unknown>,
): Omit<EstablecimientoCard, 'id'> | undefined => {
  const nombre = stringFromKeys(record, ESTABLECIMIENTO_NAME_KEYS);
  const direccion = stringFromKeys(record, DIRECCION_KEYS);
  const coords = extractCoords(record);
  const mapsQuery = coords
    ? `${coords.lat},${coords.lng}`
    : [nombre, direccion].filter(Boolean).join(' ');

  const mapsUrl = mapsQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
    : undefined;

  if (!nombre && !direccion) {
    return undefined;
  }

  const mesasRaw = record['mesas'];
  let mesas: MesaResumen[] = [];
  
  if (Array.isArray(mesasRaw)) {
    const mesasMap = new Map<string, MesaSummaryAccumulator>();
    const visited = new Set<unknown>();
    
    mesasRaw.forEach((mesa) => {
      if (mesa && typeof mesa === 'object') {
        collectMesaSummaries(mesa, mesasMap, visited);
      }
    });
    
    mesas = sortMesas(
      Array.from(mesasMap.values()).map((entry) => ({
        id: `mesa-${entry.numero}`,
        numero: entry.numero,
        esMesaTestigo: entry.esMesaTestigo ? true : undefined,
        fiscales: entry.fiscales.size > 0 ? Array.from(entry.fiscales) : undefined,
      })),
    );
  }

  const fiscalGeneral = stringFromKeys(record, ['nombre_fiscal_general']);
  const telefono = stringFromKeys(record, ['telefono_fg', 'telefono']);

  const fiscalesGeneralesRaw = record['fg_asignado'];
  const fiscalesGenerales = Array.isArray(fiscalesGeneralesRaw)
    ? fiscalesGeneralesRaw.reduce<RoleContact[]>((acc, value) => {
        if (!isRecord(value)) return acc;
        const apellidos = str(value['apellidos_miembro'] ?? value['apellidos']);
        const nombres = str(value['nombres_miembro'] ?? value['nombres']);
        const telefonoFiscal = stringFromKeys(value, PHONE_KEYS);

        const nombreCompleto =
          apellidos && nombres ? `${apellidos}, ${nombres}` : apellidos || nombres;

        if (!nombreCompleto && !telefonoFiscal) return acc;

        acc.push({
          nombre: nombreCompleto,
          telefono: telefonoFiscal,
        });
        return acc;
      }, [])
    : undefined;

  return {
    nombre,
    direccion,
    mapsQuery: mapsQuery || undefined,
    mapsUrl,
    fiscalGeneral,
    telefono,
    fiscalesGenerales,
    mesas: mesas.length > 0 ? mesas : undefined,
  };
};

const collectEstablecimientos = (
  value: unknown,
  results: Map<string, EstablecimientoCard>,
  visited: Set<unknown>,
) => {
  if (value === null || value === undefined) return;
  if (typeof value !== 'object') return;
  if (visited.has(value)) return;
  visited.add(value);

  if (Array.isArray(value)) {
    value.forEach((item) => collectEstablecimientos(item, results, visited));
    return;
  }

  if (!isRecord(value)) return;

  const card = buildEstablecimientoCard(value);
  if (card) {
    const key = `${(card.nombre ?? '').toLowerCase()}|${(card.direccion ?? '').toLowerCase()}`;
    const existing = results.get(key);
    if (existing) {
      results.set(key, mergeEstablecimientoCard(existing, card));
    } else {
      results.set(key, {
        id: key || `est-${results.size}`,
        ...card,
      });
    }
  }

  for (const nested of Object.values(value)) {
    if (nested && typeof nested === 'object') {
      collectEstablecimientos(nested, results, visited);
    }
  }
};

const extractEstablecimientos = (data?: FiscalData | null): EstablecimientoCard[] => {
  if (!data) return [];

  const visited = new Set<unknown>();
  const results = new Map<string, EstablecimientoCard>();
  collectEstablecimientos(data, results, visited);

  return Array.from(results.values());
};

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });

const isLikelyPhone = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (!/^[\d+\s().-]+$/.test(trimmed)) return false;
  const digitsOnly = trimmed.replace(/\D/g, '');
  return digitsOnly.length >= 6;
};

const FiscalizacionActions: React.FC = () => {
  const history = useHistory();
  const { fiscalData, hasFiscalData, setFiscalData } = useFiscalData();
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
    const value = fiscalData.nombre_tipo_miembro || fiscalData.tipo_fiscal;
    return typeof value === 'string' ? value.trim() : '';
  }, [fiscalData]);

  const normalizedMemberType = useMemo(() => memberType.trim().toUpperCase(), [memberType]);

  const isFiscalGeneral = useMemo(
    () => normalizedMemberType.includes('FISCAL GENERAL'),
    [normalizedMemberType],
  );

  const isFiscalZonal = useMemo(
    () => normalizedMemberType.includes('FISCAL ZONAL'),
    [normalizedMemberType],
  );

  const establecimientosAsignados = useMemo(
    () => extractEstablecimientos(fiscalData ?? undefined),
    [fiscalData],
  );

  const canViewAssignments = useMemo(
    () => isFiscalGeneral || isFiscalZonal,
    [isFiscalGeneral, isFiscalZonal],
  );

  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [establecimientoForm, setEstablecimientoForm] = useState<EstablecimientoFormState>({
    seccion: '',
    circuito: '',
    mesa: '',
    nombre: '',
  });
  const [isSendingPhoto, setIsSendingPhoto] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [useCustomMesa, setUseCustomMesa] = useState(false);
  const [showEstablecimientosModal, setShowEstablecimientosModal] = useState(false);
  const [mesasModalState, setMesasModalState] = useState<MesasModalState | null>(null);

  const {
    mesa: mesaAsignadaDesdeData,
    establecimiento: establecimientoDesdeData,
    direccion: direccionDesdeData,
  } = useMemo(() => getFiscalAssignmentDetails(fiscalData ?? undefined), [fiscalData]);

  const mesaAsignada = mesaAsignadaDesdeData || localStorage.getItem('mesa_nro')?.trim();

  const establecimientoAsignado = establecimientoDesdeData;
  const direccionAsignada = direccionDesdeData;

  const mesaOptions = useMemo(() => {
    const values = new Set<string>();
    if (mesaAsignada) values.add(mesaAsignada);
    return Array.from(values).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [mesaAsignada]);

  const clearFotoState = useCallback(() => {
    setFotoBlob(null);
    setFotoPreview('');
    localStorage.removeItem('fotoActa');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleOpenModal = () => {
    const defaultMesa = localStorage.getItem('mesa_nro')?.trim() || mesaAsignada || '';
    setEstablecimientoForm({
      seccion: localStorage.getItem('seccion')?.trim() ?? '',
      circuito: localStorage.getItem('circuito')?.trim() ?? '',
      mesa: defaultMesa,
      nombre: establecimientoAsignado ?? '',
    });
    setUseCustomMesa(!defaultMesa || !mesaOptions.includes(defaultMesa));
    setSendError(null);
    setShowPhotoModal(true);
  };

  const enviarFoto = useCallback(async () => {
    if (!fotoBlob) {
      setSendError('Debes tomar o subir una foto antes de enviarla.');
      return;
    }

    const mesaSeleccionada = establecimientoForm.mesa.trim();
    if (!mesaSeleccionada) {
      setSendError('Debes seleccionar una mesa antes de enviar la foto.');
      return;
    }

    const fd = new FormData();
    fd.append('file', fotoBlob, 'acta.jpg');
    fd.append('fecha', new Date().toISOString());
    fd.append('establecimiento', JSON.stringify({
      seccion: establecimientoForm.seccion.trim(),
      circuito: establecimientoForm.circuito.trim(),
      mesa: mesaSeleccionada,
      nombre: establecimientoForm.nombre.trim(),
    }));
    fd.append('persona', JSON.stringify({
      dni: user?.dni || '',
      nombre: memberNameParts.nombres ?? '',
      apellido: memberNameParts.apellidos ?? '',
      email: user?.email || '',
    }));

    try {
      setIsSendingPhoto(true);
      setSendError(null);

      const response = await fetch(
        'https://api.lalibertadavanzacomuna7.com/api/actasFoto/enviar-foto',
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: localStorage.getItem('token') || '',
          },
          body: fd,
        },
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      localStorage.setItem('mesa_nro', mesaSeleccionada);
      clearFotoState();
      setShowPhotoModal(false);
      history.replace('/fiscalizacion-acciones');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      setSendError(message);
    } finally {
      setIsSendingPhoto(false);
    }
  }, [clearFotoState, establecimientoForm, fotoBlob, history, memberNameParts, user]);

  const handleFoto = async () => {
    if (Capacitor.getPlatform() === 'web') {
      fileInputRef.current?.click();
      return;
    }

    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        quality: 80,
        source: CameraSource.Camera,
        direction: CameraDirection.Rear,
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

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoBlob(file);
    const preview = await blobToDataUrl(file);
    setFotoPreview(preview);
    localStorage.setItem('fotoActa', preview);
  };

  const handleOpenAssignments = useCallback(() => {
    if (isFiscalGeneral) {
      const groups = establecimientosAsignados
        .map((establecimiento) => ({
          establecimiento,
          mesas: sanitizeMesas(establecimiento.mesas),
        }))
        .filter((group) => group.mesas.length > 0);

      setMesasModalState({
        title: 'Mesas asignadas',
        groups,
        emptyMessage: 'No hay mesas registradas para este establecimiento.',
        noGroupsMessage: 'No hay mesas registradas para tus establecimientos asignados.',
      });
      return;
    }

    setShowEstablecimientosModal(true);
  }, [establecimientosAsignados, isFiscalGeneral, setMesasModalState, setShowEstablecimientosModal]);

  const coords = useMemo<{ lat: number; lng: number } | undefined>(() => {
    const fd = (fiscalData as unknown as FiscalDataGeo) || null;
    if (!fd) return undefined;
    const u = fd.ubicacion ?? fd.establecimiento_fiscalizacion?.ubicacion;
    const lat = toNumber(u?.lat);
    const lng = toNumber(u?.lng);
    return lat !== undefined && lng !== undefined ? { lat, lng } : undefined;
  }, [fiscalData]);

  const mapsQuery = coords ? `${coords.lat},${coords.lng}` : undefined;

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
              <h2 className="font-semibold text-base">Fiscal</h2>
              {memberName && <p className="text-sm">{memberName}</p>}
              {memberType && <p className="text-sm text-gray-600">Tipo: {memberType}</p>}
              {mesaAsignada && <p className="text-sm text-gray-600">Mesa: {mesaAsignada}</p>}
              {establecimientoAsignado && <p className="text-sm text-gray-600">Escuela: {establecimientoAsignado}</p>}
              {direccionAsignada && <p className="text-sm text-gray-600">Dirección: {direccionAsignada}</p>}
            </IonLabel>
          </IonItem>
        )}

        <div className="flex flex-col items-center gap-4 w-4/5 mx-auto mt-4 pb-16">
          <Button onClick={handleFoto} className="w-full">
            Tomar/Subir Foto
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          {fotoPreview && (
            <div className="flex flex-col items-center w-full">
              <img src={fotoPreview} alt="Foto del acta" className="max-w-xs mt-2 rounded shadow" />
              <Button size="small" color="danger" className="mt-2 w-full" onClick={clearFotoState}>
                Borrar foto
              </Button>
              <Button
                size="small"
                color="success"
                className="mt-2 w-full"
                disabled={!fotoBlob || isSendingPhoto}
                onClick={handleOpenModal}
              >
                Enviar foto
              </Button>
            </div>
          )}

          <Button routerLink="/escrutinio" className="w-full">
            Escrutinio
          </Button>

          {canViewAssignments && (
            <Button className="w-full" onClick={handleOpenAssignments}>
              {isFiscalGeneral ? 'Ver Mesas' : 'Ver Establecimientos'}
            </Button>
          )}
        </div>

        {coords && (
          <IonItem lines="none" className="ion-margin-bottom rounded-lg overflow-hidden">
            <IonLabel>
              <p className="text-sm text-gray-600 mb-2">Mapa del establecimiento</p>
              {mapsQuery && (
                <a
                  className="mb-2 inline-block text-sm font-medium text-blue-600 underline"
                  href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir en Google Maps
                </a>
              )}
              <div className="w-full" style={{ height: 240, borderRadius: 8, overflow: 'hidden' }}>
                <iframe
                  title="Mapa"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={mapsQuery ? `https://www.google.com/maps?q=${mapsQuery}&z=16&output=embed` : ''}
                />
              </div>
            </IonLabel>
          </IonItem>
        )}
      </IonContent>

      <IonModal isOpen={showEstablecimientosModal} onDidDismiss={() => setShowEstablecimientosModal(false)}>
        <IonContent className="ion-padding">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Establecimientos</h2>
              <Button size="small" onClick={() => setShowEstablecimientosModal(false)}>
                Cerrar
              </Button>
            </div>
            {establecimientosAsignados.length === 0 ? (
              <p className="text-sm text-gray-500">No hay establecimientos asignados.</p>
            ) : (
              establecimientosAsignados.map((est) => {
                const mesas = sanitizeMesas(est.mesas);
                const fiscalesGenerales = est.fiscalesGenerales ?? [];
                const fallbackFiscal = est.fiscalGeneral
                  ? [{ nombre: est.fiscalGeneral, telefono: est.telefono }]
                  : [];
                const contactos =
                  fiscalesGenerales.length > 0
                    ? fiscalesGenerales
                    : fallbackFiscal.filter((contacto) => contacto.nombre || contacto.telefono);

                return (
                  <div key={est.id} className="rounded-lg border p-4 space-y-3">
                    {est.nombre && <p className="font-semibold">{est.nombre}</p>}
                    {est.direccion && <p className="text-sm text-gray-600">{est.direccion}</p>}

                    {contactos.length > 0 && (
                      <div className="rounded-md bg-gray-50 p-3 text-sm">
                        <p className="text-xs font-semibold uppercase text-gray-500 tracking-wide">
                          Fiscal general asignado
                        </p>
                        <ul className="mt-2 space-y-1">
                          {contactos.map((contacto, index) => (
                            <li key={index} className="flex flex-col text-sm">
                              {contacto.nombre && <span className="font-medium">{contacto.nombre}</span>}
                              {contacto.telefono && (
                                <a
                                  href={`tel:${contacto.telefono.replace(/\s+/g, '')}`}
                                  className="text-xs text-blue-600 underline"
                                >
                                  {contacto.telefono}
                                </a>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {est.mapsUrl && (
                      <a
                        href={est.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 underline"
                      >
                        Ver en Google Maps
                      </a>
                    )}

                    {mesas.length > 0 ? (
                      <div className="space-y-2">
                        {mesas.map((mesa) => {
                          const numero =
                            typeof mesa.numero === 'number'
                              ? String(mesa.numero)
                              : typeof mesa.numero === 'string'
                              ? mesa.numero
                              : undefined;
                          const mesaLabel = numero ? `Mesa ${numero}` : 'Mesa asignada';
                          return (
                            <div key={mesa.id} className="rounded-md border p-3">
                              <div className="flex items-center justify-between">
                                <p className="font-semibold text-sm">{mesaLabel}</p>
                                {mesa.esMesaTestigo && (
                                  <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                    TESTIGO
                                  </span>
                                )}
                              </div>
                              {mesa.fiscales?.length ? (
                                <ul className="mt-2 space-y-1">
                                  {mesa.fiscales.map((f, i) => (
                                    <li key={i} className="text-xs">• {f}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-gray-500 italic mt-2">Sin fiscal asignado</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">
                        No hay mesas registradas para este establecimiento.
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </IonContent>
      </IonModal>

      <IonModal isOpen={mesasModalState !== null} onDidDismiss={() => setMesasModalState(null)}>
        <IonContent className="ion-padding">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{mesasModalState?.title ?? 'Mesas'}</h2>
              <Button size="small" onClick={() => setMesasModalState(null)}>
                Cerrar
              </Button>
            </div>
            {mesasModalState?.groups && mesasModalState.groups.length > 0 ? (
              mesasModalState.groups.map((group) => {
                const mesas = group.mesas;
                return (
                  <div key={group.establecimiento.id} className="space-y-3">
                    {(group.establecimiento.nombre || group.establecimiento.direccion) && (
                      <div>
                        {group.establecimiento.nombre && (
                          <p className="font-semibold text-sm">{group.establecimiento.nombre}</p>
                        )}
                        {group.establecimiento.direccion && (
                          <p className="text-xs text-gray-500">{group.establecimiento.direccion}</p>
                        )}
                      </div>
                    )}
                    {mesas.length > 0 ? (
                      mesas.map((mesa) => {
                        const numero =
                          typeof mesa.numero === 'number'
                            ? String(mesa.numero)
                            : typeof mesa.numero === 'string'
                            ? mesa.numero
                            : undefined;
                        const mesaLabel = numero ? `Mesa ${numero}` : 'Mesa asignada';
                        return (
                          <div key={mesa.id} className="rounded-md border p-3">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold">{mesaLabel}</p>
                              {mesa.esMesaTestigo && (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                  TESTIGO
                                </span>
                              )}
                            </div>
                            {mesa.fiscales?.length ? (
                              <ul className="mt-2 space-y-1">
                                {mesa.fiscales.map((f, i) => (
                                  <li key={i} className="text-sm">• {f}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-gray-500 mt-2 italic">Sin fiscal asignado</p>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-gray-500 italic">
                        {mesasModalState?.emptyMessage ?? 'No hay mesas registradas para este establecimiento.'}
                      </p>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500">
                {mesasModalState?.noGroupsMessage ??
                  mesasModalState?.emptyMessage ??
                  'No hay mesas disponibles.'}
              </p>
            )}
          </div>
        </IonContent>
      </IonModal>

      <IonModal isOpen={showPhotoModal} onDidDismiss={() => setShowPhotoModal(false)}>
        <IonContent className="ion-padding">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Confirmar envío</h2>
            {mesaOptions.length > 0 && !useCustomMesa && (
              <IonItem>
                <IonLabel position="stacked">Mesa</IonLabel>
                <IonSelect
                  value={establecimientoForm.mesa}
                  onIonChange={(e) => setEstablecimientoForm(prev => ({ ...prev, mesa: e.detail.value }))}
                >
                  {mesaOptions.map(m => (
                    <IonSelectOption key={m} value={m}>{m}</IonSelectOption>
                  ))}
                  <IonSelectOption value="__custom__">Otra mesa...</IonSelectOption>
                </IonSelect>
              </IonItem>
            )}
            {(useCustomMesa || mesaOptions.length === 0) && (
              <IonItem>
                <IonLabel position="stacked">Número de mesa</IonLabel>
                <Input
                  value={establecimientoForm.mesa}
                  onIonChange={(e) => setEstablecimientoForm(prev => ({ ...prev, mesa: e.detail.value ?? '' }))}
                  placeholder="Ingresa el número"
                />
              </IonItem>
            )}
            {sendError && <p className="text-sm text-red-600">{sendError}</p>}
            <div className="flex gap-2">
              <Button color="medium" fill="outline" onClick={() => setShowPhotoModal(false)} disabled={isSendingPhoto}>
                Cancelar
              </Button>
              <Button onClick={enviarFoto} disabled={isSendingPhoto}>
                {isSendingPhoto ? 'Enviando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </IonContent>
      </IonModal>
    </Layout>
  );
};

export default FiscalizacionActions;