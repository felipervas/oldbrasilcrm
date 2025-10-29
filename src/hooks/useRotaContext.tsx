import { createContext, useContext, useState, ReactNode } from 'react';
import { Prospect } from './useProspects';

interface RotaContextType {
  prospectsSelecionados: Prospect[];
  toggleProspect: (prospect: Prospect) => void;
  limparSelecao: () => void;
}

const RotaContext = createContext<RotaContextType | undefined>(undefined);

export const RotaProvider = ({ children }: { children: ReactNode }) => {
  const [prospectsSelecionados, setProspectsSelecionados] = useState<Prospect[]>([]);

  const toggleProspect = (prospect: Prospect) => {
    setProspectsSelecionados((prev) => {
      const exists = prev.find((p) => p.id === prospect.id);
      if (exists) {
        return prev.filter((p) => p.id !== prospect.id);
      }
      return [...prev, prospect];
    });
  };

  const limparSelecao = () => {
    setProspectsSelecionados([]);
  };

  return (
    <RotaContext.Provider value={{ prospectsSelecionados, toggleProspect, limparSelecao }}>
      {children}
    </RotaContext.Provider>
  );
};

export const useRotaContext = () => {
  const context = useContext(RotaContext);
  if (!context) {
    throw new Error('useRotaContext deve ser usado dentro de um RotaProvider');
  }
  return context;
};
