import React, { createContext, useContext, useState } from 'react';

interface FiscalDataContextValue {
  fiscalData: unknown | null;
  setFiscalData: React.Dispatch<React.SetStateAction<unknown | null>>;
  hasFiscalData: boolean;
}

const FiscalDataContext = createContext<FiscalDataContextValue | undefined>(
  undefined,
);

export const FiscalDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [fiscalData, setFiscalData] = useState<unknown | null>(() => {
    const stored = localStorage.getItem('fiscalData');
    return stored ? JSON.parse(stored) : null;
  });

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
