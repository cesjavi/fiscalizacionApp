import React from 'react';
import { IonButton } from '@ionic/react';

export type ButtonProps = React.ComponentProps<typeof IonButton>;

const Button: React.FC<ButtonProps> = ({
  className = '',
  color = 'primary',
  style,
  ...rest
}) => {
  const radius = '12px';
  const mergedStyle = {
    '--border-radius': radius,
    borderRadius: radius,
    ...style,
  } as React.CSSProperties;

  return (
    <IonButton
      color={color}
      className={`rounded-button px-4 py-2 ${className}`}
      style={mergedStyle}
      {...rest}
    />
  );
};

export default Button;
