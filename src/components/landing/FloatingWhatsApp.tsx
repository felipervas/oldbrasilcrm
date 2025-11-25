import { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { trackEvent, CONVERSION_EVENTS } from '@/lib/analytics';
import { gerarLinkWhatsAppContextual } from '@/lib/whatsapp';
import { supabase } from '@/integrations/supabase/client';

export const FloatingWhatsApp = () => {
  const [visible, setVisible] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
      setShowMessage(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (showMessage) {
      const timer = setTimeout(() => setShowMessage(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [showMessage]);

  if (!visible) return null;

  const handleClick = async () => {
    trackEvent(CONVERSION_EVENTS.WHATSAPP_FLOAT, { origin: 'floating_button' });
    
    // Save to database
    try {
      await supabase.from('whatsapp_clicks').insert({
        contexto: 'floating_button',
        user_agent: navigator.userAgent,
        referrer: document.referrer,
        extra_data: { type: 'float' }
      });
    } catch (error) {
      console.error('Erro ao salvar clique WhatsApp:', error);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Tooltip */}
      {showMessage && (
        <div className="bg-background shadow-lg rounded-lg p-3 max-w-xs animate-in slide-in-from-right border border-border">
          <div className="flex items-start gap-2">
            <p className="text-sm text-foreground">
              💬 Precisa de ajuda? Fale com nossa equipe agora!
            </p>
            <button
              onClick={() => setShowMessage(false)}
              className="flex-shrink-0"
              aria-label="Fechar mensagem"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Botão Principal */}
      <a
        href={gerarLinkWhatsAppContextual('inline')}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="group relative bg-[#25d366] hover:bg-[#20ba5a] text-white rounded-full p-4 shadow-2xl hover:shadow-green-500/30 transition-all duration-300 hover:scale-110"
        aria-label="Fale conosco no WhatsApp"
      >
        <MessageCircle className="h-6 w-6" />
        
        {/* Pulso Animado */}
        <span className="absolute -inset-1 rounded-full bg-[#25d366] opacity-75 animate-ping" />
      </a>
    </div>
  );
};
