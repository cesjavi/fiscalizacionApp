import React from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonFooter
} from '@ionic/react';
import { useAuth } from '../AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children, footer }) => {
  const { logout } = useAuth();

  return (
    <IonPage className="flex flex-col min-h-screen">
      <IonHeader className="bg-primary-500 text-white">
        <IonToolbar className="flex justify-between items-center px-4">
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
