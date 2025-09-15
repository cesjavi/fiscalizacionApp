import React, { createContext, useContext, useState, useEffect } from 'react';

export interface FiscalData {
  persona: {
    nombre: string;
    apellido: string;
  };
  tipo_fiscal: string;
  zona: string;
}

interface FiscalDataContextValue {
  fiscalData: FiscalData | null;
  setFiscalData: React.Dispatch<React.SetStateAction<FiscalData | null>>;
  hasFiscalData: boolean;
}

const FiscalDataContext = createContext<FiscalDataContextValue | undefined>(
  undefined,
);

export const FiscalDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [fiscalData, setFiscalData] = useState<FiscalData | null>(() => {
    const stored = localStorage.getItem('fiscalData');
    return stored ? (JSON.parse(stored) as FiscalData) : null;
  });

  useEffect(() => {
    if (fiscalData === null) {
      localStorage.removeItem('fiscalData');
    } else {
      localStorage.setItem('fiscalData', JSON.stringify(fiscalData));
    }
  }, [fiscalData]);

  const value: FiscalDataContextValue = {
    fiscalData,
    setFiscalData,
    hasFiscalData: fiscalData !== null,
  };

  return (
    <FiscalDataContext.Provider value={value}>
      {children}
    </FiscalDataContext.Provider>
  );
};

export const useFiscalData = (): FiscalDataContextValue => {
  const ctx = useContext(FiscalDataContext);
  if (!ctx) {
    throw new Error('useFiscalData must be used within a FiscalDataProvider');
  }
  return ctx;
};

export default FiscalDataContext;
