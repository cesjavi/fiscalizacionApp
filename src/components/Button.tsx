import React from 'react';
import { IonButton } from '@ionic/react';

export type ButtonProps = React.ComponentProps<typeof IonButton>;

const Button: React.FC<ButtonProps> = ({
  className = '',
  color = 'primary',
  style,
  ...rest
}) => {
  return (
    <IonButton
      color={color}
      className={`px-4 py-2 rounded ${className}`}
      style={style}
      {...rest}
    />
  );
};

export default Button;
