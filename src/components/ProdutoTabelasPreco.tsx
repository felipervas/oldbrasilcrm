import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface TabelaPreco {
  id: string;
  nome_tabela: string;
  preco_por_kg: number;
  ativo: boolean;
  usar_no_site: boolean;
}

interface ProdutoTabelasPrecoProps {
  produtoId: string;
}

export const ProdutoTabelasPreco = ({ produtoId }: ProdutoTabelasPrecoProps) => {
  const [tabelas, setTabelas] = useState<TabelaPreco[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTabelas();
  }, [produtoId]);

  const loadTabelas = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('produto_tabelas_preco')
      .select('*')
      .eq('produto_id', produtoId)
      .order('nome_tabela');
    
    setTabelas(data || []);
    setLoading(false);
  };

  if (loading) return null;
  if (tabelas.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t">
      <p className="text-xs font-semibold text-muted-foreground mb-2">📊 Tabelas de Negociação:</p>
      <div className="flex flex-wrap gap-2">
        {tabelas.map(t => (
          <Badge 
            key={t.id} 
            variant={t.ativo ? "default" : "secondary"}
            className="text-xs"
          >
            {t.nome_tabela}: R$ {t.preco_por_kg.toFixed(2)}/kg
            {t.usar_no_site && ' 🌐'}
            {!t.ativo && ' (inativa)'}
          </Badge>
        ))}
      </div>
    </div>
  );
};
