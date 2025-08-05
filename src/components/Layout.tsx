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

  useEffect(() => {
    if (!showStats) {
      setTotalVoters(0);
      setVotedCount(0);
    }
  }, [showStats]);

  const handleStats = async () => {
    const total = await voterDB.voters.count();
    const voted = await voterDB.voters.where('voto').equals(true).count();
    setTotalVoters(total);
    setVotedCount(voted);
    setShowStats(true);
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
          <IonTitle className="font-bold text-lg">Fiscalizacion App</IonTitle>
          <IonButtons slot="end">
            <IonButton color="light" onClick={handleStats}>Estadísticas</IonButton>
            <IonButton color="light" onClick={logout}>Desloguearse</IonButton>
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
