import React, { createContext, useContext } from 'react';
import { useDataInternal, DataContextType } from '@/hooks/useData';

// Create a context with a default undefined value
const DataContext = createContext<DataContextType | undefined>(undefined);

// The provider component that will wrap our app
export const DataProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const data = useDataInternal();
  return (
    <DataContext.Provider value={data}>
      {children}
    </DataContext.Provider>
  );
};

// The custom hook that our components will use to access the shared data
export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
