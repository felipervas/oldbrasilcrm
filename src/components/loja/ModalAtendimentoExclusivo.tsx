import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const LOCAL_STORAGE_KEY = "oldBrasil_modalAtendimentoVisto";
const TEMPO_EXIBICAO_MS = 60 * 1000; // 1 minuto

export const ModalAtendimentoExclusivo = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    mensagem: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    // Verificar se o modal já foi exibido antes
    const jaVisto = localStorage.getItem(LOCAL_STORAGE_KEY);
    
    if (jaVisto) {
      return; // Não mostrar novamente
    }

    // Timer para exibir após 1 minuto
    const timer = setTimeout(() => {
      setOpen(true);
      // Marcar como visto imediatamente ao exibir
      localStorage.setItem(LOCAL_STORAGE_KEY, "true");
    }, TEMPO_EXIBICAO_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação: nome + (email OU telefone) são obrigatórios
    if (!formData.nome.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, preencha seu nome.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.email.trim() && !formData.telefone.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, preencha seu email ou telefone.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("loja_leads")
        .insert({
          nome: formData.nome.trim(),
          email: formData.email.trim() || null,
          telefone: formData.telefone.trim() || null,
          mensagem: formData.mensagem.trim() || null,
          origem: "modal_1min"
        });

      if (error) throw error;

      toast({
        title: "Contato enviado!",
        description: "Em breve nossa equipe entrará em contato com você."
      });

      setOpen(false);
    } catch (error) {
      console.error("Erro ao salvar lead:", error);
      toast({
        title: "Erro ao enviar",
        description: "Ocorreu um erro. Por favor, tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Quer ser atendido de forma exclusiva?</DialogTitle>
          <DialogDescription>
            Preencha seu contato e em breve alguém de nossa equipe vai te responder.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              placeholder="Seu nome completo"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              type="tel"
              placeholder="(00) 00000-0000"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mensagem">Mensagem (opcional)</Label>
            <Textarea
              id="mensagem"
              placeholder="Conte-nos sobre seu interesse..."
              value={formData.mensagem}
              onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
              disabled={loading}
              rows={3}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            * Preencha pelo menos email ou telefone para que possamos entrar em contato.
          </p>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="flex-1"
            >
              Agora não
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Enviando..." : "Enviar contato"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
