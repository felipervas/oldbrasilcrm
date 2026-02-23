

## Melhorias na Loja: Catalogos + Fotos UNIKA

### Problemas Encontrados

**1. Catalogos nao aparecem corretamente**
- O catalogo "Tabela de Preco Unika" foi salvo com tipo `tabela_precos` (com "s"), mas o codigo so reconhece `tabela_preco` (sem "s"). Resultado: o badge fica cinza generico "Outro" em vez de azul "Tabela de Preco".
- Todos os 9 catalogos tem `marca_id = null`, entao nao aparecem vinculados a nenhuma marca na loja.
- A query usa `select("*, marcas(nome)")` que depende de `marca_id` estar preenchido - como esta null, nao mostra a marca.

**2. Produtos UNIKA sem foto**
- De 155 produtos UNIKA, apenas 36 tem foto. Sao **119 produtos sem imagem**.
- O usuario quer que todos usem a mesma foto padrao da UNIKA.

---

### Solucao

#### Parte 1: Corrigir dados dos catalogos no banco

- Atualizar o tipo `tabela_precos` para `tabela_preco` (padrao do codigo)
- Vincular cada catalogo a sua marca correta via `marca_id`, usando o nome para identificar (ex: "Catalogo Unika" -> marca UNIKA, "Catalogo Gencau" -> marca Gencau, etc.)

#### Parte 2: Inserir foto padrao para todos os produtos UNIKA sem imagem

- Usar a URL de uma foto UNIKA ja existente: `https://uwbzrkqtwmykniijbwik.supabase.co/storage/v1/object/public/produto-imagens/307801bf-f796-478b-8882-66d621558567-1761923445046.jpg`
- Inserir um registro em `produto_imagens` com `ordem = 0` para cada um dos 119 produtos que nao tem foto

#### Parte 3: Melhorar o componente LojaCatalogos

- Adicionar `tabela_precos` como alias no mapeamento de tipos (para suportar ambos os formatos)
- Melhorar visual geral dos cards

---

### Secao Tecnica

**Arquivo: `src/pages/loja/LojaCatalogos.tsx`**
- Adicionar `tabela_precos` no mapa de tipos para cobrir o valor salvo no banco

**Operacoes no banco de dados (via insert tool):**

1. UPDATE nos catalogos para corrigir `marca_id` vinculando cada catalogo a sua marca
2. UPDATE no catalogo com tipo errado (`tabela_precos` -> `tabela_preco`)
3. INSERT em `produto_imagens` para os 119 produtos UNIKA sem foto, usando a mesma URL de referencia

**Nenhuma migration necessaria** - sao apenas operacoes de dados (INSERT/UPDATE).

