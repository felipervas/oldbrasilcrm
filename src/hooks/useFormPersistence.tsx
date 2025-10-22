import { useState, useEffect } from 'react';

/**
 * Hook personalizado para persistir dados do formulário no localStorage
 * Restaura dados ao carregar e permite limpá-los quando necessário
 */
export const useFormPersistence = <T,>(key: string, initialValue: T) => {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Erro ao restaurar ${key} do localStorage:`, error);
      return initialValue;
    }
  });

  const [hasRestoredData, setHasRestoredData] = useState(false);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item && item !== JSON.stringify(initialValue)) {
        setHasRestoredData(true);
      }
    } catch (error) {
      console.error('Erro ao verificar dados restaurados:', error);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Erro ao salvar ${key} no localStorage:`, error);
    }
  }, [key, value]);

  const clearStorage = () => {
    try {
      window.localStorage.removeItem(key);
      setValue(initialValue);
      setHasRestoredData(false);
    } catch (error) {
      console.error(`Erro ao limpar ${key} do localStorage:`, error);
    }
  };

  return [value, setValue, clearStorage, hasRestoredData] as const;
};
