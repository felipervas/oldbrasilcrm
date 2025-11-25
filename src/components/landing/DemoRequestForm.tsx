import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent, CONVERSION_EVENTS } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { CheckCircle2 } from 'lucide-react';

const formSchema = z.object({
  nome: z.string().min(2, 'Nome muito curto').max(100),
  empresa: z.string().min(2, 'Nome da empresa obrigatório').max(100),
  telefone: z.string().min(10, 'Telefone inválido'),
  email: z.string().email('Email inválido').max(255),
  mensagem: z.string().max(500).optional(),
});

// Rate limiting
const RATE_LIMIT_KEY = 'form_submission_timestamps';
const MAX_SUBMISSIONS = 3;
const WINDOW_MS = 60 * 60 * 1000; // 1 hora

const checkRateLimit = (): boolean => {
  const now = Date.now();
  const stored = localStorage.getItem(RATE_LIMIT_KEY);
  
  if (!stored) {
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify([now]));
    return true;
  }
  
  const timestamps: number[] = JSON.parse(stored);
  const recentSubmissions = timestamps.filter(t => now - t < WINDOW_MS);
  
  if (recentSubmissions.length >= MAX_SUBMISSIONS) {
    return false;
  }
  
  recentSubmissions.push(now);
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(recentSubmissions));
  return true;
};

export const DemoRequestForm = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Rate limiting check
    if (!checkRateLimit()) {
      toast({
        title: 'Muitas tentativas',
        description: 'Por favor, aguarde antes de enviar novamente.',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    // Honeypot check (anti-bot)
    if (formData.get('website')) {
      // É bot, ignorar silenciosamente
      setLoading(false);
      return;
    }
    
    const data = {
      nome: formData.get('nome') as string,
      empresa: formData.get('empresa') as string,
      telefone: formData.get('telefone') as string,
      email: formData.get('email') as string,
      mensagem: formData.get('mensagem') as string || '',
    };

    // Validação
    const result = formSchema.safeParse(data);
    if (!result.success) {
      toast({
        title: 'Erro de validação',
        description: result.error.errors[0].message,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      // Salvar no Supabase
      const { error } = await supabase.from('leads_landing').insert({
        ...data,
        origem: 'landing_page',
      });

      if (error) throw error;

      // Analytics
      trackEvent(CONVERSION_EVENTS.DEMO_REQUEST, {
        empresa: data.empresa,
      });

      setSuccess(true);
      toast({
        title: 'Sucesso!',
        description: 'Sua solicitação foi enviada. Entraremos em contato em breve.',
      });
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar. Por favor, tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-2xl p-8 text-center max-w-lg mx-auto">
        <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-2">
          Solicitação Enviada!
        </h3>
        <p className="text-green-700 dark:text-green-300">
          Nossa equipe entrará em contato em até 24 horas para agendar sua demonstração.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} id="demo-form" className="space-y-6 max-w-lg mx-auto">
      {/* Honeypot field (hidden from users, catches bots) */}
      <input
        type="text"
        name="website"
        style={{ display: 'none' }}
        tabIndex={-1}
        autoComplete="off"
      />
      
      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">
          Nome Completo *
        </label>
        <input
          type="text"
          name="nome"
          required
          className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
          placeholder="João Silva"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">
          Empresa *
        </label>
        <input
          type="text"
          name="empresa"
          required
          className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
          placeholder="Distribuidora ABC"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            Telefone *
          </label>
          <input
            type="tel"
            name="telefone"
            required
            className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
            placeholder="(47) 99999-9999"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            Email *
          </label>
          <input
            type="email"
            name="email"
            required
            className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
            placeholder="joao@empresa.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">
          Mensagem (opcional)
        </label>
        <textarea
          name="mensagem"
          rows={4}
          className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground resize-none"
          placeholder="Como podemos ajudar sua empresa?"
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        size="lg"
        className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg"
      >
        {loading ? 'Enviando...' : '🚀 Solicitar Demonstração Gratuita'}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Ao enviar, você concorda com nossa Política de Privacidade
      </p>
    </form>
  );
};
