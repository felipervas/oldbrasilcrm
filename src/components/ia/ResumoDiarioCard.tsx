import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, AlertTriangle, Target, RefreshCw } from 'lucide-react';
import { useIAVendas } from '@/hooks/useIAVendas';

export function ResumoDiarioCard() {
  const { resumoDiario, loadingResumoDiario, refetchResumoDiario } = useIAVendas();

  const handleGerar = () => {
    refetchResumoDiario();
  };

  if (!resumoDiario && !loadingResumoDiario) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Resumo Diário com IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGerar} className="w-full">
            <Sparkles className="h-4 w-4 mr-2" />
            Gerar Resumo do Dia
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loadingResumoDiario) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
            <p className="text-sm text-muted-foreground">Analisando vendas com IA...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          Resumo Diário
        </CardTitle>
        <Button size="sm" variant="outline" onClick={handleGerar}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">Tarefas Atrasadas</p>
            <p className="text-2xl font-bold">{resumoDiario.metricas?.tarefasAtrasadas || 0}</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">Clientes em Risco</p>
            <p className="text-2xl font-bold text-orange-600">{resumoDiario.metricas?.clientesEmRisco || 0}</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">Novos Leads</p>
            <p className="text-2xl font-bold text-green-600">{resumoDiario.metricas?.novosLeads || 0}</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">Faturamento Mês</p>
            <p className="text-lg font-bold">R$ {(resumoDiario.metricas?.faturamentoMes || 0).toFixed(0)}</p>
          </div>
        </div>

        {/* Resumo Geral */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">📊 Análise Geral</h4>
          <p className="text-sm text-muted-foreground">{resumoDiario.resumoGeral}</p>
        </div>

        {/* Alertas Críticos */}
        {resumoDiario.alertasCriticos?.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Alertas Críticos
            </h4>
            <div className="space-y-1">
              {resumoDiario.alertasCriticos.map((alerta: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-red-600">•</span>
                  <span>{alerta}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Oportunidades */}
        {resumoDiario.oportunidades?.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Oportunidades
            </h4>
            <div className="space-y-1">
              {resumoDiario.oportunidades.map((oportunidade: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-green-600">✓</span>
                  <span>{oportunidade}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ações Recomendadas */}
        {resumoDiario.acoesRecomendadas?.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              Ações Recomendadas
            </h4>
            <div className="space-y-2">
              {resumoDiario.acoesRecomendadas.map((acao: any, i: number) => (
                <div key={i} className="p-2 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant={
                      acao.prioridade === 'alta' ? 'destructive' :
                      acao.prioridade === 'media' ? 'default' : 'secondary'
                    }>
                      {acao.prioridade}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{acao.prazo}</span>
                  </div>
                  <p className="text-sm">{acao.acao}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metas do Dia */}
        {resumoDiario.metasDia?.length > 0 && (
          <div className="space-y-2 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 rounded-lg">
            <h4 className="font-semibold text-sm">🎯 Metas do Dia</h4>
            <div className="space-y-1">
              {resumoDiario.metasDia.map((meta: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span>□</span>
                  <span>{meta}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}