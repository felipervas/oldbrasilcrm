export const WHATSAPP_NUMBER = "5547992620525"; // 47 99262-0525

export const gerarLinkWhatsApp = (produto?: {
  nome: string;
  sku: string;
  marca: string;
}) => {
  if (!produto) {
    const mensagem = encodeURIComponent(
      "Olá! Gostaria de mais informações sobre os produtos OLD BRASIL."
    );
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${mensagem}`;
  }
  
  const mensagem = encodeURIComponent(
    `Olá! Tenho interesse no produto:\n\n📦 *${produto.nome}*\n🏷️ SKU: ${produto.sku}\n🏭 Marca: ${produto.marca}\n\nGostaria de solicitar um orçamento!`
  );
  
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${mensagem}`;
};
