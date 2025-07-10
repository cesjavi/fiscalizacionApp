import React from 'react';
import { IonCard } from '@ionic/react';

export type CardProps = React.ComponentProps<typeof IonCard>;

const Card: React.FC<CardProps> = ({ className = '', ...rest }) => {
  return <IonCard className={`p-4 shadow ${className}`} {...rest} />;
};

export default Card;
