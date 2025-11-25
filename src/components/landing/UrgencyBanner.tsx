import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const calculateTimeLeft = () => {
  // Define o fim do dia atual às 23:59:59
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  
  const diff = endOfDay.getTime() - now.getTime();
  
  return {
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
};

export const UrgencyBanner = () => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  if (!isVisible) return null;
  
  return (
    <div className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 text-white py-3 px-4 sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto flex items-center justify-center gap-3 text-sm md:text-base">
        <Clock className="h-5 w-5 animate-pulse" />
        <span className="font-semibold">
          🔥 Oferta Limitada: Demonstração Gratuita + Consultoria Exclusiva
        </span>
        <span className="hidden sm:inline">•</span>
        <div className="font-mono bg-white/20 px-3 py-1 rounded backdrop-blur-sm">
          {String(timeLeft.hours).padStart(2, '0')}:
          {String(timeLeft.minutes).padStart(2, '0')}:
          {String(timeLeft.seconds).padStart(2, '0')}
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="ml-2 hover:bg-white/10 rounded-full p-1 transition-colors"
          aria-label="Fechar banner"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
