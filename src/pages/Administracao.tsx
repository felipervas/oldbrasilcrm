import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";

const Administracao = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [filtroAcao, setFiltroAcao] = useState("all");
  const [filtroEntidade, setFiltroEntidade] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    
    try {
      let query = (supabase as any)
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (filtroUsuario) {
        query = query.or(`user_nome.ilike.%${filtroUsuario}%,user_email.ilike.%${filtroUsuario}%`);
      }
      
      if (filtroAcao !== 'all') {
        query = query.eq('acao', filtroAcao);
      }
      
      if (filtroEntidade !== 'all') {
        query = query.eq('entidade_tipo', filtroEntidade);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Erro ao carregar audit log:', error);
        toast({ 
          title: "Erro ao carregar histórico", 
          description: error.message || "Verifique se você tem permissão de Gestor ou Admin",
          variant: "destructive" 
        });
      } else {
        setLogs(data || []);
        if (!data || data.length === 0) {
          toast({
            title: "Nenhum registro encontrado",
            description: "Ainda não há histórico de ações registradas ou você precisa ser Gestor/Admin para visualizar",
          });
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar logs:', err);
      toast({ 
        title: "Erro ao carregar dados", 
        description: "Verifique sua conexão e permissões",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const exportarCSV = () => {
    const csv = [
      ['Data/Hora', 'Usuário', 'Ação', 'Entidade', 'ID'].join(','),
      ...logs.map(log => [
        new Date(log.created_at).toLocaleString('pt-BR'),
        log.user_nome || log.user_email,
        log.acao,
        log.entidade_tipo,
        log.entidade_id
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_log_${new Date().toISOString()}.csv`;
    a.click();
  };

  const getAcaoBadge = (acao: string) => {
    const colors: Record<string, string> = {
      INSERT: 'bg-green-500',
      UPDATE: 'bg-blue-500',
      DELETE: 'bg-red-500',
    };
    return <Badge className={colors[acao] || 'bg-gray-500'}>{acao}</Badge>;
  };

  return (
    <AppLayout>
      <div className="flex-1 space-y-6 p-4 md:p-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Administração - Histórico de Ações
            </h1>
            <p className="text-muted-foreground">
              Rastreamento completo de todas as ações no sistema
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Usuário</Label>
                <Input
                  placeholder="Buscar por nome ou email"
                  value={filtroUsuario}
                  onChange={(e) => setFiltroUsuario(e.target.value)}
                />
              </div>
              
              <div>
                <Label>Ação</Label>
                <Select value={filtroAcao} onValueChange={setFiltroAcao}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="INSERT">Criar</SelectItem>
                    <SelectItem value="UPDATE">Atualizar</SelectItem>
                    <SelectItem value="DELETE">Deletar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Entidade</Label>
                <Select value={filtroEntidade} onValueChange={setFiltroEntidade}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="pedidos">Pedidos</SelectItem>
                    <SelectItem value="produtos">Produtos</SelectItem>
                    <SelectItem value="clientes">Clientes</SelectItem>
                    <SelectItem value="tarefas">Tarefas</SelectItem>
                    <SelectItem value="amostras">Amostras</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end gap-2">
                <Button onClick={loadLogs} className="flex-1">
                  Aplicar Filtros
                </Button>
                <Button variant="outline" onClick={exportarCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico ({logs.length} registros)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8">Carregando...</p>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhum registro encontrado</p>
                <p className="text-sm text-muted-foreground mt-2">
                  As ações realizadas no sistema aparecerão aqui.
                  {'\n'}Você precisa ter perfil de Gestor ou Admin para visualizar o histórico.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{log.user_nome || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{log.user_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getAcaoBadge(log.acao)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.entidade_tipo}</Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {log.entidade_id?.slice(0, 8)}...
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Administracao;
