import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';
import { useIAVendas } from '@/hooks/useIAVendas';
import { useState } from 'react';

interface InsightsClienteCardProps {
  clienteId: string;
  clienteNome: string;
}

export function InsightsClienteCard({ clienteId, clienteNome }: InsightsClienteCardProps) {
  const { gerarInsightsCliente } = useIAVendas();
  const [insights, setInsights] = useState<any>(null);

  const handleGerarInsights = async () => {
    const resultado = await gerarInsightsCliente.mutateAsync(clienteId);
    setInsights(resultado);
  };

  if (!insights && !gerarInsightsCliente.isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Insights de IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGerarInsights} className="w-full">
            <Sparkles className="h-4 w-4 mr-2" />
            Gerar Insights com IA
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (gerarInsightsCliente.isPending) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
            <p className="text-sm text-muted-foreground">Analisando dados com IA...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          Insights de IA: {clienteNome}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Resumo</h4>
          <p className="text-sm text-muted-foreground">{insights.resumo}</p>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            Produtos Recomendados
          </h4>
          <div className="flex flex-wrap gap-2">
            {insights.produtosRecomendados?.map((produto: string, i: number) => (
              <Badge key={i} variant="secondary">{produto}</Badge>
            ))}
          </div>
        </div>

        {insights.oportunidadeUpsell && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Oportunidade de Upsell
            </h4>
            <p className="text-sm text-muted-foreground">{insights.oportunidadeUpsell}</p>
          </div>
        )}

        {insights.riscos && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Riscos Identificados
            </h4>
            <p className="text-sm text-muted-foreground">{insights.riscos}</p>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-600" />
            Próxima Ação Recomendada
          </h4>
          <p className="text-sm text-muted-foreground">{insights.proximaAcao}</p>
        </div>

        {insights.previsaoProximaCompra && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">Previsão de próxima compra</p>
            <p className="text-sm font-medium">{insights.previsaoProximaCompra}</p>
          </div>
        )}

        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleGerarInsights}
          className="w-full"
        >
          Atualizar Insights
        </Button>
      </CardContent>
    </Card>
  );
}