import React from 'react';
import { IonButton } from '@ionic/react';

export type ButtonProps = React.ComponentProps<typeof IonButton>;

const Button: React.FC<ButtonProps> = ({ className = '', ...rest }) => {
  return <IonButton className={`px-4 py-2 rounded ${className}`} {...rest} />;
};

export default Button;
