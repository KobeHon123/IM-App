import React, { createContext, useState, useEffect, useContext } from 'react';

interface EasterEggContextType {
  showOffWorkCounter: boolean;
  setShowOffWorkCounter: (show: boolean) => void;
  handleBioTap: () => void;
  timeLeft: string;
  isOffTime: boolean;
  isBeforeTenAM: boolean;
  isWeekend: boolean;
}

const EasterEggContext = createContext<EasterEggContextType | undefined>(undefined);

export const EasterEggProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bioTapCount, setBioTapCount] = useState(0);
  const [showOffWorkCounter, setShowOffWorkCounter] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isOffTime, setIsOffTime] = useState(false);
  const [isBeforeTenAM, setIsBeforeTenAM] = useState(false);
  const [isWeekend, setIsWeekend] = useState(false);

  const handleBioTap = () => {
    setBioTapCount(prev => {
      const newCount = prev + 1;
      if (newCount === 3) {
        setShowOffWorkCounter(true);
        return 0;
      }
      return newCount;
    });
  };

  useEffect(() => {
    if (!showOffWorkCounter) return;

    const updateTimer = () => {
      const now = new Date();
      const offWorkTime = new Date();
      offWorkTime.setHours(18, 30, 0, 0); // 6:30 PM

      // Check if it's weekend (Saturday = 6, Sunday = 0)
      const dayOfWeek = now.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        setIsWeekend(true);
      } else {
        setIsWeekend(false);
      }

      // Check if it's before 10:00 AM
      const currentHour = now.getHours();
      if (currentHour < 10) {
        setIsBeforeTenAM(true);
      } else {
        setIsBeforeTenAM(false);
      }

      // Check if it's currently 6:30 PM or later today
      const currentTime = new Date();
      const currentOffWorkTime = new Date();
      currentOffWorkTime.setHours(18, 30, 0, 0);
      
      if (currentTime >= currentOffWorkTime && currentTime.getHours() < 23) {
        setIsOffTime(true);
      } else {
        setIsOffTime(false);
        // If it's already past 6:30 PM, set it to tomorrow
        if (now > offWorkTime) {
          offWorkTime.setDate(offWorkTime.getDate() + 1);
        }
      }

      const diff = offWorkTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        setIsOffTime(true);
        setTimeLeft('');
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [showOffWorkCounter]);

  return (
    <EasterEggContext.Provider value={{ showOffWorkCounter, setShowOffWorkCounter, handleBioTap, timeLeft, isOffTime, isBeforeTenAM, isWeekend }}>
      {children}
    </EasterEggContext.Provider>
  );
};

export const useEasterEgg = () => {
  const context = useContext(EasterEggContext);
  if (!context) {
    throw new Error('useEasterEgg must be used within EasterEggProvider');
  }
  return context;
};
