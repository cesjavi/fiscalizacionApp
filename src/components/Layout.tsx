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

interface LayoutProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  backHref?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, footer, backHref }) => {
  const { logout } = useAuth();
  const history = useHistory();

  return (
    <IonPage className="flex flex-col min-h-screen">
      <IonHeader className="bg-primary-500 text-white">
        <IonToolbar className="flex justify-between items-center px-4">
          {backHref && (
            <IonButtons slot="start">
              <IonButton
                color="light"
                className="font-semibold"
                onClick={() => history.push(backHref)}
              >
                <IonIcon icon={chevronBackOutline} slot="start" />
                Back
              </IonButton>
            </IonButtons>
          )}
          <IonTitle className="font-bold text-lg">Fiscalizacion App</IonTitle>
          <IonButtons slot="end">
            <IonButton color="light" onClick={logout}>Logout</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      {children}
      {footer && <IonFooter>{footer}</IonFooter>}
    </IonPage>
  );
};

export default Layout;
