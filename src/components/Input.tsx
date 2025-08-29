import React from 'react';
import { IonInput } from '@ionic/react';

export type InputProps = Omit<React.ComponentProps<typeof IonInput>, 'maxlength'> & {
  maxLength?: number;
};

const Input: React.FC<InputProps> = ({ className = '', maxLength, ...rest }) => {
  return (
    <IonInput
      className={`border border-gray-300 rounded px-2 py-1 ${className}`}
      maxlength={maxLength}
      {...rest}
    />
  );
};

export default Input;
