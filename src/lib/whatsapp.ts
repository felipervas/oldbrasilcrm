export const WHATSAPP_NUMBER = "5547992620525"; // 47 99262-0525

export const gerarLinkWhatsApp = (produto?: {
  nome: string;
  marca: string;
}) => {
  if (!produto) {
    const mensagem = encodeURIComponent(
      "Olá! Gostaria de mais informações sobre os produtos OLD BRASIL."
    );
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${mensagem}`;
  }
  
  const mensagem = encodeURIComponent(
    `Olá! Tenho interesse no produto:\n\n📦 *${produto.nome}*\n🏭 Marca: ${produto.marca}\n\nGostaria de solicitar um orçamento!`
  );
  
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${mensagem}`;
};

// Mensagens contextuais para landing page
type ContextoWhatsApp = 'hero' | 'features' | 'pricing' | 'demo' | 'urgency' | 'exitIntent' | 'inline';

export const gerarLinkWhatsAppContextual = (
  contexto: ContextoWhatsApp,
  dados?: { empresa?: string; feature?: string }
) => {
  const mensagens: Record<ContextoWhatsApp, string> = {
    hero: `Olá! 👋 Vim do site e quero saber mais sobre o CRM OLD BRASIL. Posso tirar algumas dúvidas?`,
    
    features: `Olá! Vi os recursos do CRM e tenho interesse em: ${dados?.feature || 'todas as funcionalidades'}. Pode me ajudar?`,
    
    pricing: `Olá! Gostaria de informações sobre planos e preços do CRM. Qual o melhor plano para minha empresa?`,
    
    demo: `Olá! Quero agendar uma demonstração do CRM. Minha empresa: ${dados?.empresa || '[nome da empresa]'}. Quando podemos conversar?`,
    
    urgency: `Olá! Vi a oferta limitada no site e quero aproveitar! Como faço para garantir meu desconto?`,
    
    exitIntent: `Olá! Estava navegando no site e tenho interesse no CRM, mas preciso de mais informações antes de decidir.`,
    
    inline: `Olá! Gostaria de falar com um especialista sobre o CRM OLD BRASIL. Estou na página principal do site.`,
  };
  
  const mensagem = encodeURIComponent(mensagens[contexto] || mensagens.hero);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${mensagem}`;
};
