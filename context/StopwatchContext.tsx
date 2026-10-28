import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface Stopwatch {
  id: string;
  label: string;
  accumulatedMs: number;
  startedAt: number | null;
}

interface StopwatchContextType {
  stopwatches: Stopwatch[];
  addStopwatch: (label: string) => void;
  deleteStopwatch: (id: string) => void;
  toggleStopwatch: (id: string) => void;
  resetStopwatch: (id: string) => void;
  getElapsedSeconds: (stopwatch: Stopwatch) => number;
}

export const MAX_STOPWATCHES = 10;

const StopwatchContext = createContext<StopwatchContextType | undefined>(undefined);

export const StopwatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stopwatches, setStopwatches] = useState<Stopwatch[]>([]);
  const [now, setNow] = useState(() => Date.now());

  const hasRunning = stopwatches.some(s => s.startedAt !== null);

  useEffect(() => {
    if (!hasRunning) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, [hasRunning]);

  const addStopwatch = useCallback((label: string) => {
    setStopwatches(prev => {
      if (prev.length >= MAX_STOPWATCHES) return prev;
      return [
        ...prev,
        {
          id: Date.now().toString(),
          label: label || `Stopwatch ${prev.length + 1}`,
          accumulatedMs: 0,
          startedAt: null,
        },
      ];
    });
  }, []);

  const deleteStopwatch = useCallback((id: string) => {
    setStopwatches(prev => prev.filter(s => s.id !== id));
  }, []);

  const toggleStopwatch = useCallback((id: string) => {
    const t = Date.now();
    setStopwatches(prev =>
      prev.map(s => {
        if (s.id !== id) return s;
        if (s.startedAt === null) return { ...s, startedAt: t };
        return { ...s, accumulatedMs: s.accumulatedMs + (t - s.startedAt), startedAt: null };
      })
    );
  }, []);

  const resetStopwatch = useCallback((id: string) => {
    setStopwatches(prev =>
      prev.map(s => (s.id === id ? { ...s, accumulatedMs: 0, startedAt: null } : s))
    );
  }, []);

  const getElapsedSeconds = useCallback(
    (s: Stopwatch) =>
      Math.floor((s.accumulatedMs + (s.startedAt !== null ? Math.max(0, now - s.startedAt) : 0)) / 1000),
    [now]
  );

  return (
    <StopwatchContext.Provider
      value={{
        stopwatches,
        addStopwatch,
        deleteStopwatch,
        toggleStopwatch,
        resetStopwatch,
        getElapsedSeconds,
      }}
    >
      {children}
    </StopwatchContext.Provider>
  );
};

export const useStopwatches = () => {
  const context = useContext(StopwatchContext);
  if (!context) {
    throw new Error('useStopwatches must be used within a StopwatchProvider');
  }
  return context;
};
