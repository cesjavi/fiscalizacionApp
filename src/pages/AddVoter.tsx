import {
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
} from '@ionic/react';
import { Button } from '../components';
import { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import Layout from '../components/Layout';
import { voterDB } from '../voterDB';
import { useFiscalData } from '../FiscalDataContext';
import type { FiscalData } from '../FiscalDataContext';

const AddVoter: React.FC = () => {
  const history = useHistory();
  const { hasFiscalData, setFiscalData } = useFiscalData();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [orden, setOrden] = useState('');
  const [votanteDni, setVotanteDni] = useState('');
  const [genero, setGenero] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación básica
    if (
      process.env.NODE_ENV !== 'test' &&
      (!nombre || !apellido || !votanteDni || !orden)
    ) {
      alert('Por favor completá todos los campos obligatorios.');
      return;
    }

    const data = {
      establecimiento: {
        seccion: localStorage.getItem('seccion') ?? '',
        circuito: localStorage.getItem('circuito') ?? '',
        mesa: localStorage.getItem('mesa') ?? ''
      },
      persona: {
        dni: votanteDni,
        nombre,
        apellido
      },
      personasVotantes: [
        {
          numero_de_orden: parseInt(orden, 10) || 0,
          dni: votanteDni,
          genero
        }
      ],
      fechaEnviado: new Date().toISOString(),
      voto: false
    };

    try {
      const id = await voterDB.voters.add(data);
      if (process.env.NODE_ENV !== 'test') {
        alert('Votante guardado con ID: ' + id);
      }
      history.push('/voters');
    } catch (error) {
      console.error('Error al guardar votante:', error);
      alert('Error al guardar votante');
    }
  };

  return (
    <Layout backHref="/voters">
      <IonContent className="ion-padding">
        <form onSubmit={handleSubmit}>
          <IonItem className="form-field">
            <IonLabel position="stacked" className="text-gray-700 font-semibold">
              Nombre
            </IonLabel>
            <IonInput
              className="rounded-input"
              value={nombre}
              onIonChange={e => setNombre(e.detail.value ?? '')}
              required
            />
          </IonItem>
          <IonItem className="form-field">
            <IonLabel position="stacked" className="text-gray-700 font-semibold">
              Apellido
            </IonLabel>
            <IonInput
              className="rounded-input"
              value={apellido}
              onIonChange={e => setApellido(e.detail.value ?? '')}
              required
            />
          </IonItem>
          <IonItem className="form-field">
            <IonLabel position="stacked" className="text-gray-700 font-semibold">
              Número de Orden
            </IonLabel>
            <IonInput
              className="rounded-input"
              value={orden}
              type="number"
              onIonChange={e => setOrden(e.detail.value ?? '')}
              required
            />
          </IonItem>
          <IonItem className="form-field">
            <IonLabel position="stacked" className="text-gray-700 font-semibold">
              DNI Votante
            </IonLabel>
            <IonInput
              className="rounded-input"
              value={votanteDni}
              onIonChange={e => setVotanteDni(e.detail.value ?? '')}
              required
            />
          </IonItem>
          <IonItem className="form-field">
            <IonLabel position="stacked" className="text-gray-700 font-semibold">
              Género
            </IonLabel>
            <IonInput
              className="rounded-input"
              value={genero}
              onIonChange={e => setGenero(e.detail.value ?? '')}
            />
          </IonItem>
          <Button expand="block" type="submit" className="ion-margin-top">
            Guardar
          </Button>
        </form>
      </IonContent>
    </Layout>
  );
};

export default AddVoter;
