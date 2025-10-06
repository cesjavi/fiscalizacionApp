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
import { getMemberNameParts, useFiscalData } from '../FiscalDataContext';
import type { FiscalData } from '../FiscalDataContext';



interface LayoutProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  backHref?: string;
}
const joinMemberName = (apellidos?: string, nombres?: string) => {
  if (apellidos && nombres) {
    return `${apellidos}, ${nombres}`;
  }

  return apellidos || nombres || '';
};

export function formatTitle(fd?: FiscalData | null) {
  const baseTitle = 'Fiscalizacion App';
  if (!fd) return baseTitle;

  const normalizedApellidos =
    typeof fd.apellidos_miembro === 'string' ? fd.apellidos_miembro.trim() : '';
  const normalizedNombres =
    typeof fd.nombres_miembro === 'string' ? fd.nombres_miembro.trim() : '';

  const { apellidos, nombres, displayName } = getMemberNameParts(fd);

  if (normalizedApellidos || normalizedNombres) {
    const normalizedTitle = joinMemberName(normalizedApellidos, normalizedNombres);
    if (normalizedTitle) {
      return normalizedTitle;
    }
  }

  if (displayName) {
    return displayName;
  }

  const fallbackTitle = joinMemberName(apellidos, nombres);
  if (fallbackTitle) {
    return fallbackTitle;
  }

  return baseTitle;
}
const Layout: React.FC<LayoutProps> = ({ children, footer, backHref }) => {
  const { logout } = useAuth();
  const history = useHistory();
  const { fiscalData, setFiscalData } = useFiscalData();
  //const title = formatTitle(fiscalData);

  const HIDE_NAME_ROUTES = ['/login', '/fiscalizacion-lookup'];
  const isHideName = HIDE_NAME_ROUTES.some((r) =>
    location.pathname === r || location.pathname.startsWith(`${r}/`)
  );

  const title = isHideName ? 'Fiscalizacion App' : formatTitle(fiscalData);  // ⬅️

  const handleLogout = async () => {
    setFiscalData?.(null);
    try { localStorage.removeItem('fiscalData'); } catch {
      // Ignore errors removing fiscalData from localStorage
    }
    await logout();
    history.replace('/login');
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
