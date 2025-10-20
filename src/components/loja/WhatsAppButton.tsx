import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export const WhatsAppButton = () => {
  const [open, setOpen] = useState(false);
  const [vendedores, setVendedores] = useState<any[]>([]);
  
  useEffect(() => {
    if (open) loadVendedores();
  }, [open]);
  
  const loadVendedores = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, nome, telefone')
      .not('telefone', 'is', null)
      .order('nome');
    
    setVendedores(data || []);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="fixed bottom-6 right-6 z-50 bg-[#25d366] hover:bg-[#20ba5a] text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
          aria-label="Fale conosco no WhatsApp"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      </DialogTrigger>
      
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fale Conosco no WhatsApp</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          {vendedores.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Nenhum vendedor disponível no momento
            </p>
          ) : (
            vendedores.map(v => (
              <a
                key={v.id}
                href={`https://wa.me/55${v.telefone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 border rounded-lg hover:bg-accent transition-colors"
                onClick={() => setOpen(false)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-lg">{v.nome}</p>
                    <p className="text-sm text-muted-foreground">{v.telefone}</p>
                  </div>
                  <MessageCircle className="h-5 w-5 text-[#25d366]" />
                </div>
              </a>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
