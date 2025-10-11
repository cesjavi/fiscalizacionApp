import React from 'react';
import { IonInput } from '@ionic/react';

export type InputProps = Omit<React.ComponentProps<typeof IonInput>, 'maxlength'> & {
  maxLength?: number;
};

const Input: React.FC<InputProps> = ({ className = '', maxLength, style, ...rest }) => {
  const radius = '12px';
  const mergedStyle = {
    '--border-radius': radius,
    '--padding-start': '0.75rem',
    '--padding-end': '0.75rem',
    '--padding-top': '0.75rem',
    '--padding-bottom': '0.75rem',
    ...style,
  } as React.CSSProperties;

  return (
    <IonInput
      className={`rounded-input ${className}`}
      maxlength={maxLength}
      style={mergedStyle}
      {...rest}
    />
  );
};

export default Input;
