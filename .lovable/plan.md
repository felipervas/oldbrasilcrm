## Plano

Corrigir o bloco "Dados do Cliente" no PDF do pedido para que valores longos (Endereço, Loja, Email, etc.) quebrem para a linha de baixo dentro da própria coluna, em vez de invadir a coluna ao lado.

### O que muda

1. Substituir o helper `linha(...)` por uma versão que:
   - Quebra o valor automaticamente respeitando a largura disponível da coluna.
   - Retorna a altura ocupada (em linhas) para que a próxima linha seja posicionada abaixo da maior coluna.
2. Calcular a altura total do bloco "DADOS DO CLIENTE" dinamicamente e desenhar o retângulo de fundo com essa altura, evitando que o conteúdo vaze ou que sobre espaço em branco.
3. Avançar `y` (início da tabela de itens) com base na altura real do bloco.

### Detalhe técnico

- Usar `doc.splitTextToSize(value, larguraColuna - paddingLabel)` para quebrar texto.
- Largura de cada coluna ≈ `(pageWidth - margin*2) / 2 - 16`. Offset do valor após o label (`x + 60`) é descontado.
- Espaçamento entre linhas mantém 14 (entre rows lógicas) + 10 por linha extra de wrap.
- Apenas o arquivo `src/lib/pedidoPdf.ts` é alterado; nenhuma mudança no front nem no banco.