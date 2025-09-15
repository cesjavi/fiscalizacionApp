import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonFooter,
  IonIcon,
  IonModal,
  IonContent
} from '@ionic/react';
import { chevronBackOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { voterDB } from '../voterDB';
import { useFiscalData } from '../FiscalDataContext';
import type { FiscalData } from '../FiscalDataContext';

interface LayoutProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  backHref?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, footer, backHref }) => {
  const { logout } = useAuth();
  const history = useHistory();
  const [showStats, setShowStats] = useState(false);
  const [totalVoters, setTotalVoters] = useState(0);
  const [votedCount, setVotedCount] = useState(0);
  let fiscalData: FiscalData | null = null;
  try {
    ({ fiscalData } = useFiscalData());
  } catch {
    fiscalData = null;
  }
  const title = fiscalData
    ? `${fiscalData.persona.nombre} ${fiscalData.persona.apellido} – ${fiscalData.tipo_fiscal} – ${fiscalData.zona}`
    : 'Fiscalizacion App';

  useEffect(() => {
    if (!showStats) {
      setTotalVoters(0);
      setVotedCount(0);
    }
  }, [showStats]);

  const handleStats = async () => {
    const all = await voterDB.voters.toArray();
    const total = all.length;
    const voted = all.filter(v => v.voto).length;
    setTotalVoters(total);
    setVotedCount(voted);
    setShowStats(true);
  };

  const handleLogout = async () => {
    await logout();
    history.push('/login');
  };

  return (
    <IonPage className="flex flex-col min-h-screen">
      <IonHeader className="bg-primary-500 text-white">
        <IonToolbar className="flex justify-between items-center px-4">
          {backHref && (
            <IonButtons slot="start">
              <IonButton
                color="primary"
                className="font-semibold"
                onClick={() => history.push(backHref)}
              >
                <IonIcon icon={chevronBackOutline} slot="start" />
                Volver
              </IonButton>
            </IonButtons>
          )}
          <IonTitle className="font-bold text-lg">{title}</IonTitle>
          <IonButtons slot="end">
            <IonButton color="primary" onClick={handleStats}>Estadísticas</IonButton>
            <IonButton color="primary" onClick={handleLogout}>Desloguearse</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonModal isOpen={showStats} onDidDismiss={() => setShowStats(false)}>
        <IonContent className="p-4">
          <p>Cantidad de votantes: {totalVoters}</p>
          <p>Cantidad que votó: {votedCount}</p>
          <p>
            Porcentaje: {totalVoters ? ((votedCount / totalVoters) * 100).toFixed(2) : '0.00'}%
          </p>
          <IonButton onClick={() => setShowStats(false)}>Cerrar</IonButton>
        </IonContent>
      </IonModal>
      {children}
      {footer && <IonFooter>{footer}</IonFooter>}
    </IonPage>
  );
};

export default Layout;
