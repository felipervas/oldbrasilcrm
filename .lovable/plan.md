

## Substituir Dados Reais por Dados Ficticios

O projeto tem referencias a "OLD BRASIL" espalhadas por ~15 arquivos, incluindo numero de WhatsApp real, email, logos e textos especificos. Vou trocar tudo por dados ficticios genericos para que o projeto possa ser vendido como template.

### Nome ficticio escolhido: **ACME Distribuidora**
- WhatsApp: 5511999999999
- Email: contato@acmedistribuidora.com.br
- URL mock: app.acmedistribuidora.com/dashboard

---

### Arquivos a editar

**1. `index.html`** - Meta tags, titulo, OG tags
- "OLD BRASIL" -> "ACME Distribuidora"
- Remover URLs de imagens externas do Google Storage (usar placeholder)

**2. `src/lib/whatsapp.ts`** - Numero WhatsApp e mensagens
- `5547992620525` -> `5511999999999`
- "OLD BRASIL" -> "ACME Distribuidora"

**3. `src/components/loja/LojaHeader.tsx`** - Logo alt text e nome
- "OLD BRASIL" -> "ACME Distribuidora"

**4. `src/components/loja/LojaFooter.tsx`** - Copyright, telefone, logo
- "OLD BRASIL" -> "ACME Distribuidora"
- "(47) 99262-0525" -> "(11) 99999-9999"

**5. `src/pages/loja/LojaHome.tsx`** - Hero section textos
- "Ingredientes Premium para Sorveterias e Confeitarias" -> texto generico de distribuidora

**6. `src/pages/Login.tsx`** - Nome do sistema, area restrita
- "OLD CRM" -> "ACME CRM"
- "Equipe OLD Brasil" -> "Equipe ACME"

**7. `src/pages/LandingPage.tsx`** - Helmet/SEO, schema.org
- Todas refs "OLD BRASIL" -> "ACME Distribuidora"

**8. `src/components/landing/LandingHeader.tsx`** - Logo alt
- "OLD BRASIL" -> "ACME Distribuidora"

**9. `src/components/landing/LandingFooter.tsx`** - Copyright, email, logo
- "OLD BRASIL" -> "ACME Distribuidora"
- `contato@oldbrasil.com.br` -> `contato@acmedistribuidora.com.br`
- WhatsApp `5547999999999` -> `5511999999999`

**10. `src/components/landing/HeroSection.tsx`** - URL mock dashboard
- `app.oldbrasil.com/dashboard` -> `app.acmedistribuidora.com/dashboard`

**11. `src/components/landing/TestimonialsCarousel.tsx`** - Depoimentos
- "CRM OLD BRASIL" -> "CRM ACME"
- Nomes e empresas ficticias ja estao ok (Joao Silva, etc.)

**12. `src/components/landing/ProofSection.tsx`** - Marcas parceiras
- `['Nestle', 'Deux', 'Bauducco', 'Cacau Show', 'Mondelez']` -> `['Marca Alpha', 'Marca Beta', 'Marca Gamma', 'Marca Delta', 'Marca Omega']`

**13. `src/components/landing/FAQSection.tsx`** - Link WhatsApp
- `5547999999999` -> `5511999999999`

**14. `src/components/landing/LiveProof.tsx`** - Cidades e nomes ficticios
- Trocar cidades reais (Joinville, Blumenau, etc.) por cidades genericas

**15. `src/components/loja/ModalAtendimentoExclusivo.tsx`** - localStorage key
- `oldBrasil_modalAtendimentoVisto` -> `acme_modalAtendimentoVisto`

---

### Secao Tecnica

- Total de ~15 arquivos com edicoes
- Nenhuma mudanca de banco de dados necessaria
- Logo continuara usando o mesmo arquivo de imagem (o usuario pode trocar depois) - apenas os textos alt serao alterados
- Nenhuma mudanca estrutural ou de logica, apenas strings/textos

