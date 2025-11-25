import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Gift, X } from 'lucide-react';
import { trackEvent, CONVERSION_EVENTS } from '@/lib/analytics';
import { gerarLinkWhatsAppContextual } from '@/lib/whatsapp';

export const ExitIntentModal = () => {
  const [showModal, setShowModal] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  
  useEffect(() => {
    // Não mostrar se já foi exibido nesta sessão
    if (hasShown) return;
    
    // Detectar quando usuário vai sair da página
    const handleMouseLeave = (e: MouseEvent) => {
      // Apenas se o mouse sair pela parte superior
      if (e.clientY <= 0 && !hasShown) {
        setShowModal(true);
        setHasShown(true);
        trackEvent(CONVERSION_EVENTS.EXIT_INTENT_SHOWN);
      }
    };
    
    // Esperar 5 segundos antes de ativar (não incomodar logo de cara)
    const timer = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 5000);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [hasShown]);
  
  const handleAccept = () => {
    trackEvent(CONVERSION_EVENTS.EXIT_INTENT_CONVERTED);
    // Scroll para o formulário
    const form = document.getElementById('demo-form');
    if (form) {
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setShowModal(false);
  };
  
  const handleWhatsApp = () => {
    trackEvent(CONVERSION_EVENTS.EXIT_INTENT_CONVERTED, { method: 'whatsapp' });
    window.open(gerarLinkWhatsAppContextual('exitIntent'), '_blank');
    setShowModal(false);
  };
  
  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-2 border-primary/20">
        <button
          onClick={() => setShowModal(false)}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-1 hover:bg-white/20 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-8 text-white text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
            <Gift className="h-8 w-8" />
          </div>
          
          <h3 className="text-2xl font-bold mb-2">
            ⏰ Espere! Temos uma Oferta para Você
          </h3>
          
          <p className="text-white/90 text-sm mb-6">
            Agende uma demonstração nos próximos 10 minutos e ganhe:
          </p>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-6 space-y-2 text-left">
            <div className="flex items-start gap-2">
              <span className="text-lg">✅</span>
              <span className="text-sm"><strong>Demonstração Personalizada</strong> da plataforma</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">✅</span>
              <span className="text-sm"><strong>Consultoria Gratuita</strong> de 30 minutos</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">✅</span>
              <span className="text-sm"><strong>Material Exclusivo</strong> sobre gestão de vendas</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button 
              size="lg" 
              className="w-full bg-white text-primary hover:bg-white/90 font-bold text-base h-12"
              onClick={handleAccept}
            >
              Quero Minha Demonstração Agora
            </Button>
            
            <button
              onClick={handleWhatsApp}
              className="w-full bg-[#25d366] hover:bg-[#20ba5a] text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle className="h-5 w-5" />
              Ou Fale no WhatsApp Agora
            </button>
          </div>
          
          <p className="text-xs text-white/70 mt-4">
            ⏱️ Oferta válida apenas para os próximos visitantes
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Importar MessageCircle para o botão WhatsApp
import { MessageCircle } from 'lucide-react';
