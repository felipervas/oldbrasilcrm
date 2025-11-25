import { MessageCircle, ArrowRight } from 'lucide-react';
import { gerarLinkWhatsAppContextual } from '@/lib/whatsapp';
import { trackEvent, CONVERSION_EVENTS } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';

interface WhatsAppInlineCTAProps {
  contexto?: 'hero' | 'features' | 'pricing' | 'demo' | 'urgency' | 'exitIntent' | 'inline';
  className?: string;
  variant?: 'default' | 'compact';
}

export const WhatsAppInlineCTA = ({ 
  contexto = 'inline', 
  className = "",
  variant = 'default' 
}: WhatsAppInlineCTAProps) => {
  
  const handleClick = async () => {
    // Track analytics
    trackEvent(CONVERSION_EVENTS.WHATSAPP_INLINE, { 
      origin: contexto,
      type: 'inline',
      timestamp: new Date().toISOString()
    });
    
    // Save to Supabase
    try {
      await supabase.from('whatsapp_clicks').insert({
        contexto,
        user_agent: navigator.userAgent,
        referrer: document.referrer,
        extra_data: {
          variant,
          url: window.location.href
        }
      });
    } catch (error) {
      console.error('Erro ao salvar clique WhatsApp:', error);
    }
  };
  
  if (variant === 'compact') {
    return (
      <a
        href={gerarLinkWhatsAppContextual(contexto)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={`group inline-flex items-center gap-2 bg-gradient-to-r from-[#25d366] to-[#128c7e] hover:from-[#20ba5a] hover:to-[#0e7a5f] text-white px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ${className}`}
      >
        <MessageCircle className="h-5 w-5" />
        <span>Falar no WhatsApp</span>
        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
      </a>
    );
  }
  
  return (
    <a
      href={gerarLinkWhatsAppContextual(contexto)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`group flex items-center gap-4 bg-gradient-to-br from-[#25d366] via-[#20ba5a] to-[#128c7e] hover:from-[#20ba5a] hover:via-[#1fa855] hover:to-[#0e7a5f] text-white p-6 rounded-2xl font-semibold shadow-2xl hover:shadow-green-500/20 transition-all duration-300 hover:scale-[1.02] border border-white/10 ${className}`}
    >
      <div className="bg-white/20 rounded-full p-3 backdrop-blur-sm">
        <MessageCircle className="h-8 w-8" />
      </div>
      <div className="text-left flex-1">
        <div className="text-sm opacity-90 font-normal">Atendimento Imediato</div>
        <div className="text-lg font-bold mt-0.5">Fale com um Especialista Agora</div>
        <div className="text-xs opacity-80 mt-1">Resposta em menos de 5 minutos</div>
      </div>
      <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform flex-shrink-0" />
    </a>
  );
};
