import { useBoletosGestor } from '@/hooks/useBoletosGestor';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Clock, FileText } from 'lucide-react';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function BoletosGestorSection() {
  const { data, isLoading } = useBoletosGestor();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const { boletos = [], pendentes = [], totais } = data || {};

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
  };

  const getStatusBadge = (boleto: any) => {
    if (boleto.status_pagamento === 'pago') {
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Pago</Badge>;
    }
    
    const vencimento = new Date(boleto.data_vencimento);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    if (isPast(vencimento) && vencimento < hoje) {
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Vencido</Badge>;
    }
    
    if (isToday(vencimento)) {
      return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">Vence hoje</Badge>;
    }
    
    const diasRestantes = differenceInDays(vencimento, hoje);
    if (diasRestantes <= 7 && diasRestantes >= 0) {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" />Vence em {diasRestantes}d</Badge>;
    }
    
    return <Badge variant="outline">Pendente</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 border-green-500/20">
          <div className="text-sm text-muted-foreground mb-1">A Receber</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(totais?.pendente || 0)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {pendentes.length} boleto{pendentes.length !== 1 ? 's' : ''}
          </div>
        </Card>

        <Card className="p-4 border-red-500/20">
          <div className="text-sm text-muted-foreground mb-1">Vencidos</div>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(totais?.vencido || 0)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {totais?.qtdVencidos || 0} boleto{totais?.qtdVencidos !== 1 ? 's' : ''}
          </div>
        </Card>

        <Card className="p-4 border-yellow-500/20">
          <div className="text-sm text-muted-foreground mb-1">Próximos 7 Dias</div>
          <div className="text-2xl font-bold text-yellow-600">
            {formatCurrency(totais?.proximos7Dias || 0)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {totais?.qtdProximos7Dias || 0} boleto{totais?.qtdProximos7Dias !== 1 ? 's' : ''}
          </div>
        </Card>
      </div>

      {/* Lista de Boletos Pendentes */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground">Boletos Pendentes</h3>
        {pendentes.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum boleto pendente</p>
          </Card>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {pendentes.map((boleto: any) => (
              <Card key={boleto.id} className="p-3 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusBadge(boleto)}
                      <span className="font-medium truncate">
                        {(boleto.clientes as any)?.nome_fantasia || 'Cliente não identificado'}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {boleto.descricao || 'Boleto'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Vencimento: {format(new Date(boleto.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {formatCurrency(Number(boleto.valor))}
                    </div>
                    {boleto.beneficiario && (
                      <div className="text-xs text-muted-foreground">
                        {boleto.beneficiario}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}