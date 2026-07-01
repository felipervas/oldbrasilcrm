import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, Sparkles } from "lucide-react";

const TOUR_KEY = "cellos_tour_done";

const STEPS = [
  {
    title: "Bem-vindo ao Cellos CRM!",
    body: "Em poucos passos vamos te mostrar as principais ferramentas. Pronto?",
    emoji: "👋",
  },
  {
    title: "Fazer um pedido",
    body: "Vá em Pedidos → Novo, ou abra a ficha do cliente e toque em Novo Pedido — já vem com o cliente escolhido.",
    emoji: "🛒",
  },
  {
    title: "Pipeline de Vendas",
    body: "No menu Pipeline você visualiza todas as oportunidades em estágios (Lead → Fechamento) com Kanban arrastável.",
    emoji: "📊",
  },
  {
    title: "Playbook de Vendas",
    body: "Cada etapa do pipeline tem um script com checklist e respostas a objeções para te guiar.",
    emoji: "📘",
  },
  {
    title: "WhatsApp integrado",
    body: "Em todo lugar você verá botões verdes — abrem o WhatsApp com mensagem pronta. Use à vontade!",
    emoji: "💬",
  },
];

export function AppTour({ forceOpen, onClose }: { forceOpen?: boolean; onClose?: () => void }) {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) { setOpen(true); setStep(0); return; }
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) {
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [forceOpen]);

  const finish = () => {
    localStorage.setItem(TOUR_KEY, "1");
    setOpen(false);
    onClose?.();
  };

  if (!open) return null;
  const s = STEPS[step];

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card rounded-2xl shadow-2xl border border-secondary/30 max-w-md w-full p-6 relative">
        <button
          onClick={finish}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-secondary" />
          <span className="text-xs font-semibold text-secondary uppercase">Passo {step + 1} de {STEPS.length}</span>
        </div>
        <div className="text-5xl mb-3">{s.emoji}</div>
        <h3 className="text-xl font-bold text-foreground mb-2">
          {s.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-5">{s.body}</p>
        <div className="flex justify-between items-center">
          <Button variant="ghost" size="sm" onClick={finish}>Pular tour</Button>
          {step < STEPS.length - 1 ? (
            <Button size="sm" onClick={() => setStep(s => s + 1)} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              Próximo <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={finish} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              Começar a usar 🎉
            </Button>
          )}
        </div>
        <div className="flex gap-1 mt-5 justify-center">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-secondary" : "w-1.5 bg-muted"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
