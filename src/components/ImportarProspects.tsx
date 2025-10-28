import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { useBulkCreateProspects } from '@/hooks/useProspects';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export const ImportarProspects = () => {
  const [open, setOpen] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const bulkCreate = useBulkCreateProspects();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArquivo(file);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Mapear colunas do Excel para o formato do banco
      const prospects = jsonData.map((row: any) => ({
        nome_empresa: row['EMPRESA'] || row['empresa'] || row['Nome'] || row['nome'],
        cidade: row['CIDADE'] || row['cidade'] || row['Cidade'],
        estado: row['ESTADO'] || row['estado'] || row['UF'] || row['uf'],
        porte: row['PORTE'] || row['porte'] || row['Porte'],
        produto_utilizado: row['PRODUTO'] || row['produto'] || row['Produto Utilizado'],
        status: 'novo' as const,
        prioridade: 'media' as const,
        origem: 'importacao',
      }));

      setPreview(prospects.slice(0, 5)); // Mostrar apenas 5 primeiros
      toast.success(`${prospects.length} registros prontos para importar`);
    } catch (error) {
      console.error('Erro ao ler arquivo:', error);
      toast.error('Erro ao processar arquivo Excel');
    }
  };

  const handleImport = async () => {
    if (!arquivo) return;

    try {
      const data = await arquivo.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const prospects = jsonData.map((row: any) => ({
        nome_empresa: row['EMPRESA'] || row['empresa'] || row['Nome'] || row['nome'],
        cidade: row['CIDADE'] || row['cidade'] || row['Cidade'],
        estado: row['ESTADO'] || row['estado'] || row['UF'] || row['uf'],
        porte: row['PORTE'] || row['porte'] || row['Porte'],
        produto_utilizado: row['PRODUTO'] || row['produto'] || row['Produto Utilizado'],
        status: 'novo' as const,
        prioridade: 'media' as const,
        origem: 'importacao',
      }));

      await bulkCreate.mutateAsync(prospects);
      setOpen(false);
      setArquivo(null);
      setPreview([]);
    } catch (error) {
      console.error('Erro ao importar:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Importar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Prospects do Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="arquivo">Arquivo Excel (.xlsx, .xls)</Label>
            <Input
              id="arquivo"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
            />
          </div>

          {preview.length > 0 && (
            <div className="space-y-2">
              <Label>Preview (5 primeiros registros)</Label>
              <div className="border rounded-lg overflow-auto max-h-60">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Empresa</th>
                      <th className="p-2 text-left">Cidade</th>
                      <th className="p-2 text-left">Estado</th>
                      <th className="p-2 text-left">Porte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((p, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{p.nome_empresa}</td>
                        <td className="p-2">{p.cidade}</td>
                        <td className="p-2">{p.estado}</td>
                        <td className="p-2">{p.porte}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={!arquivo || bulkCreate.isPending}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {bulkCreate.isPending ? 'Importando...' : 'Importar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
