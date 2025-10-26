import React, { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { IonButton } from '@ionic/react';
import type { InputCustomEvent, InputChangeEventDetail } from '@ionic/react';
import Input, { InputProps } from './Input';

export type NumericStepperInputProps = {
  value?: string;
  onValueChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  inputProps?: Omit<InputProps, 'value' | 'onIonChange' | 'placeholder'>;
};

const clamp = (value: number, min?: number, max?: number) => {
  let next = value;
  if (typeof min === 'number') {
    next = Math.max(min, next);
  }
  if (typeof max === 'number') {
    next = Math.min(max, next);
  }
  return next;
};

const parseNumericValue = (value?: string) => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const NumericStepperInput: React.FC<NumericStepperInputProps> = ({
  value = '',
  onValueChange,
  min = 0,
  max,
  step = 1,
  placeholder,
  ariaLabel,
  disabled = false,
  inputProps,
}) => {
  const sanitizedStep = step > 0 ? step : 1;

  const currentNumber = useMemo(() => parseNumericValue(value), [value]);
  const effectiveCurrent = useMemo(() => {
    if (typeof currentNumber === 'number') {
      return currentNumber;
    }
    return typeof min === 'number' ? min : 0;
  }, [currentNumber, min]);

  const handleInputChange = (event: InputCustomEvent<InputChangeEventDetail>) => {
    onValueChange(event.detail.value ?? '');
  };

  const handleStep = (delta: number) => {
    const base = typeof currentNumber === 'number' ? currentNumber : effectiveCurrent;
    const nextValue = clamp(base + delta * sanitizedStep, min, max);
    onValueChange(`${nextValue}`);
  };

  const decrementDisabled = disabled || (typeof min === 'number' && effectiveCurrent <= min);
  const incrementDisabled =
    disabled ||
    (typeof max === 'number' &&
      (typeof currentNumber === 'number' ? currentNumber >= max : effectiveCurrent >= max));

  const { className = '', style, ...restInputProps } = inputProps ?? {};

  const mergedStyle: CSSProperties = {
    flex: 1,
    width: '100%',
    ...style,
  };

  const buttonStyle = {
    '--border-radius': '9999px',
    minWidth: '2.5rem',
    height: '2.5rem',
  } as CSSProperties;

  return (
    <div className="flex items-center gap-2 w-full">
      <IonButton
        type="button"
        fill="outline"
        color="medium"
        size="small"
        onClick={() => handleStep(-1)}
        disabled={decrementDisabled}
        style={buttonStyle}
      >
        −
      </IonButton>
      <Input
        value={value}
        onIonChange={handleInputChange}
        placeholder={placeholder}
        aria-label={ariaLabel}
        inputmode="numeric"
        type="number"
        className={`flex-1 ${className}`}
        style={mergedStyle}
        disabled={disabled}
        {...restInputProps}
      />
      <IonButton
        type="button"
        fill="outline"
        color="medium"
        size="small"
        onClick={() => handleStep(1)}
        disabled={incrementDisabled}
        style={buttonStyle}
      >
        +
      </IonButton>
    </div>
  );
};

export default NumericStepperInput;
