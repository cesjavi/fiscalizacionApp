import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { IonContent, IonItem, IonLabel, IonText } from '@ionic/react';
import { Button, Input } from '../components';
import Layout from '../components/Layout';
import { Camera, CameraResultType } from '@capacitor/camera';
import { useHistory } from 'react-router-dom';
import { useFiscalData } from '../FiscalDataContext';

interface Lista {
  id: string;
  lista: string;
  nro_lista?: string;
}
// helper común arriba del componente (o en utils)
function toErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  try { return JSON.stringify(e); } catch { return String(e); }
}


const CAMPOS_ESPECIALES = ['BLANCO', 'RECURRIDOS', 'NULOS', 'IMPUGNADOS'] as const;

// ===== API helpers igual que en FiscalizacionLookup =====
const API_BASE = (import.meta.env.VITE_API_BASE || '')
  .replace(/\/api\/?$/, '')
  .replace(/\/$/, '');

type ApiResult<T = unknown> = { ok: boolean; status: number; payload: T | string };

async function postJson<T = unknown>(
  path: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<ApiResult<T>> {
  const url = path.startsWith('http')
    ? path
    : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: JSON.stringify(body),
  });

  const ct = resp.headers.get('content-type') || '';
  const payload = ct.includes('application/json') ? await resp.json() : await resp.text();
  return { ok: resp.ok, status: resp.status, payload };
}

// ===== Componente =====
const Escrutinio: React.FC = () => {
  const history = useHistory();
  const { hasFiscalData, setFiscalData } = useFiscalData();

  const [listas, setListas] = useState<Lista[]>([]);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [foto, setFoto] = useState('');
  const [resultado, setResultado] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar listas al iniciar (requiere token)
  useEffect(() => {
    // Garantizar fiscalData
    if (!hasFiscalData) {
      const stored = localStorage.getItem('fiscalData');
      if (stored) {
        try {
          setFiscalData(JSON.parse(stored));
        } catch {
          history.replace('/fiscalizacion-lookup');
          return;
        }
      } else {
        history.replace('/fiscalizacion-lookup');
        return;
      }
    }

    type ApiLista = { identificador: string; nombre: string; nomenclatura: string };

    const fetchListas = async () => {
      setError(null);
      const token = localStorage.getItem('token') || '';
      if (!token) {
        history.replace('/fiscalizacion-lookup');
        return;
      }

      try {
        // 1) Intento con Bearer
        let r = await postJson<{ data: ApiLista[] }>(
          '/api/candidatos/listarCandidatos',
          {},
          { Authorization: `${token}` }
        );

        // 2) Si 401, reintento con token pelado (como en buscarFiscal)
        if (!r.ok && r.status === 401) {
          r = await postJson<{ data: ApiLista[] }>(
            '/api/candidatos/listarCandidatos',
            {},
            { Authorization: token }
          );
        }

        if (!r.ok) {
          const msg = typeof r.payload === 'string'
            ? r.payload
            : (r.payload as { message?: string })?.message || `HTTP ${r.status}`;
          throw new Error(msg);
        }

        const data = (r.payload as { data?: ApiLista[] }).data ?? [];
        const mapped: Lista[] = data.map(({ identificador, nombre, nomenclatura }) => ({
          id: identificador,
          lista: nombre,
          nro_lista: nomenclatura,
        }));
        setListas(mapped);
      } catch (e: unknown) {
          const msg = toErrorMessage(e);
          console.error('[escrutinio] submit error:', e);
          setError(msg || 'Error al guardar escrutinio');
          alert('[escrutinio]');
        }
    };

    fetchListas();
  }, [hasFiscalData, history, setFiscalData]);

  // Handlers
  const handleChange = (id: string, value: string) => {
    setValores((prev) => ({ ...prev, [id]: value }));
  };

  const handleFoto = async () => {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        quality: 80,
      });
      if (photo.dataUrl) setFoto(photo.dataUrl);
    } catch {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setError(null);

    // Construir objeto de resultados
    const datos: Record<string, number> = {};
    listas.forEach((l) => {
      datos[l.lista] = Number.parseInt(valores[l.id] || '0', 10) || 0;
    });
    CAMPOS_ESPECIALES.forEach((key) => {
      datos[key] = Number.parseInt(valores[key] || '0', 10) || 0;
    });

    setResultado(datos);

    const mesaId = Number(localStorage.getItem('mesaId'));
    const payload = {
      mesa_id: mesaId,
      datos,
      fecha: new Date().toISOString(),
      foto,
    };

    const token = localStorage.getItem('token') || '';
    if (!token) {
      history.replace('/fiscalizacion-lookup');
      return;
    }

    try {
      // 1) Bearer
      let r = await postJson('/api/actas/crear', payload, {
        Authorization: `${token}`,
      });

      // 2) Reintento con token pelado si 401
      if (!r.ok && r.status === 401) {
        r = await postJson('/api/actas/crear', payload, {
          Authorization: token,
        });
      }

      if (!r.ok) {
        const msg =
          typeof r.payload === 'string'
            ? r.payload
            : (r.payload as { message?: string })?.message || `HTTP ${r.status}`;
        throw new Error(msg);
      }

      alert('Escrutinio enviado correctamente');
      setFoto('');
    } catch (e: unknown) {
          const msg = toErrorMessage(e);
          console.error('[escrutinio] submit error:', e);
          setError(msg || 'Error al guardar escrutinio');
          //alert('Error al guardar escrutinio');
        }
    };
  return (
    <Layout backHref="/fiscalizacion-acciones">
      <IonContent className="ion-padding">
        {error && <p className="text-red-600 ion-margin-bottom">{error}</p>}

        {/* Inputs para todas las listas */}
        {listas.map((l) => (
          <IonItem key={l.id}>
            <IonLabel position="stacked">
              {l.nro_lista ? `${l.nro_lista} - ${l.lista}` : l.lista}
            </IonLabel>
            <Input
              type="number"
              value={valores[l.id] || ''}
              onIonChange={(e) => handleChange(l.id, e.detail.value ?? '')}
              placeholder="Cantidad de votos"
            />
          </IonItem>
        ))}

        {/* Inputs para campos especiales */}
        {CAMPOS_ESPECIALES.map((key) => (
          <IonItem key={key}>
            <IonLabel position="stacked">{key}</IonLabel>
            <Input
              type="number"
              value={valores[key] || ''}
              onIonChange={(e) => handleChange(key, e.detail.value ?? '')}
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
          {foto && <img src={foto} alt="Foto de acta" className="max-w-xs mt-2 rounded shadow" />}
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
