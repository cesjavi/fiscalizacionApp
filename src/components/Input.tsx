import React from 'react';
import { IonInput } from '@ionic/react';

export type InputProps = React.ComponentProps<typeof IonInput>;

const Input: React.FC<InputProps> = ({ className = '', ...rest }) => {
  return (
    <IonInput
      className={`border border-gray-300 rounded px-2 py-1 ${className}`}
      {...rest}
    />
  );
};

export default Input;
