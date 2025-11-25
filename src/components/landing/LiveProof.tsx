import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Action {
  nome: string;
  acao: string;
  tempo: string;
  cidade?: string;
}

const actions: Action[] = [
  { nome: "João Silva", acao: "solicitou demonstração", tempo: "2 min atrás", cidade: "São Paulo" },
  { nome: "Maria Santos", acao: "iniciou teste grátis", tempo: "5 min atrás", cidade: "Curitiba" },
  { nome: "Carlos Oliveira", acao: "falou com especialista", tempo: "8 min atrás", cidade: "Joinville" },
  { nome: "Ana Costa", acao: "baixou apresentação", tempo: "12 min atrás", cidade: "Blumenau" },
  { nome: "Pedro Almeida", acao: "agendou reunião", tempo: "15 min atrás", cidade: "Florianópolis" },
  { nome: "Juliana Rocha", acao: "solicitou orçamento", tempo: "18 min atrás", cidade: "Balneário Camboriú" },
];

const generateRandomAction = (): Action => {
  return actions[Math.floor(Math.random() * actions.length)];
};

export const LiveProof = () => {
  const [recentActions, setRecentActions] = useState<Action[]>([
    actions[0],
    actions[1],
  ]);
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    // Aparecer após 3 segundos
    const showTimer = setTimeout(() => setIsVisible(true), 3000);
    
    // Rotacionar notificações
    const interval = setInterval(() => {
      const newAction = generateRandomAction();
      setRecentActions(prev => [newAction, ...prev.slice(0, 1)]);
    }, 12000); // A cada 12 segundos
    
    return () => {
      clearTimeout(showTimer);
      clearInterval(interval);
    };
  }, []);
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed bottom-24 left-4 md:left-6 z-40 max-w-xs">
      <AnimatePresence mode="popLayout">
        {recentActions.slice(0, 1).map((action, i) => (
          <motion.div
            key={`${action.nome}-${action.tempo}-${i}`}
            initial={{ opacity: 0, x: -50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.9 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white dark:bg-slate-800 shadow-2xl rounded-xl p-4 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {action.nome}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {action.acao}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {action.tempo}
                  </p>
                  {action.cidade && (
                    <>
                      <span className="text-xs text-slate-300">•</span>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {action.cidade}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
