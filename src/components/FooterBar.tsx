import React from 'react';
import { IonToolbar, IonTitle } from '@ionic/react';

const FooterBar: React.FC = () => {
  const year = new Date().getFullYear();
  return (
    <IonToolbar className="bg-primary-500 text-white">
      <IonTitle className="text-center text-sm">&copy; {year} Fiscalizacion App</IonTitle>
    </IonToolbar>
  );
};

export default FooterBar;
