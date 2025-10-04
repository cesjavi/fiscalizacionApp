import React from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonFooter,
  IonIcon
} from '@ionic/react';
import { chevronBackOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useFiscalData } from '../FiscalDataContext';
import type { FiscalData } from '../FiscalDataContext';

interface LayoutProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  backHref?: string;
}
function formatTitle(fd?: FiscalData | null) {
  const baseTitle = 'Fiscalizacion App';
  if (!fd) return baseTitle;

  const apellidos = typeof fd.apellidos_miembro === 'string' ? fd.apellidos_miembro.trim() : '';
  const nombres = typeof fd.nombres_miembro === 'string' ? fd.nombres_miembro.trim() : '';

  if (apellidos && nombres) {
    return `${baseTitle} – ${apellidos} ${nombres}`;
  }

  return baseTitle;
}
const Layout: React.FC<LayoutProps> = ({ children, footer, backHref }) => {
  const { logout } = useAuth();
  const history = useHistory();
  const { fiscalData } = useFiscalData();
  const title = formatTitle(fiscalData);

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
            <IonButton color="primary" onClick={handleLogout}>Desloguearse</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      {children}
      {footer && <IonFooter>{footer}</IonFooter>}
    </IonPage>
  );
};

export default Layout;
