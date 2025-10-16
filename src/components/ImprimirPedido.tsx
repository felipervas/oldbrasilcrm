import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ImprimirPedidoProps {
  pedido: any;
  produtos: any[];
}

export function ImprimirPedido({ pedido, produtos }: ImprimirPedidoProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'height=800,width=800');
    if (!printWindow) return;

    printWindow.document.write('<html><head><title>Pedido</title>');
    printWindow.document.write(`
      <style>
        body { 
          font-family: Arial, sans-serif; 
          padding: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
          margin-bottom: 20px;
        }
        .logo {
          width: 150px;
          margin-bottom: 10px;
        }
        .company-info {
          font-size: 12px;
          line-height: 1.6;
        }
        .section-title {
          font-size: 18px;
          font-weight: bold;
          margin: 20px 0 10px 0;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
        .info-row {
          display: flex;
          margin: 5px 0;
          font-size: 14px;
        }
        .info-label {
          font-weight: bold;
          width: 150px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
          font-size: 12px;
        }
        th {
          background-color: #f0f0f0;
          font-weight: bold;
        }
        .totals {
          margin-top: 20px;
          text-align: right;
          font-size: 14px;
        }
        .total-row {
          margin: 5px 0;
        }
        .total-final {
          font-size: 18px;
          font-weight: bold;
          border-top: 2px solid #333;
          padding-top: 10px;
          margin-top: 10px;
        }
        @media print {
          body { margin: 0; }
        }
      </style>
    `);
    printWindow.document.write('</head><body>');
    printWindow.document.write(printContent.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const quantidadeTotal = produtos.reduce((acc, p) => acc + parseFloat(p.quantidade || 0), 0);
  const subtotal = parseFloat(pedido.valor_total || 0);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pré-visualização de Impressão</DialogTitle>
        </DialogHeader>
        <div ref={printRef} className="p-6 bg-white text-black">
          <div className="header">
            <img 
              src="/old-brasil-logo.png" 
              alt="OLD Brasil" 
              className="logo"
            />
            <div className="company-info">
              <strong>DALBERTO VASCONCELLOS LTDA - OLD Brasil</strong><br />
              CNPJ: 59.224.429/0001-05<br />
              RUA BAHIA, 34 - UNIVERSITARIO - Tijucas - SC - CEP: 88200-000<br />
              Fone: (47) 99155-0525 | (47) 99231-0525<br />
              oldvasconcellos@gmail.com
            </div>
          </div>

          <div className="info-row">
            <span className="info-label">Pedido:</span>
            <span>{pedido.numero_pedido || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Data:</span>
            <span>{pedido.data_pedido ? new Date(pedido.data_pedido).toLocaleDateString('pt-BR') : 'N/A'}</span>
          </div>

          <div className="section-title">Dados do Cliente</div>
          <div className="info-row">
            <span className="info-label">Nome:</span>
            <span>{pedido.clientes?.razao_social || pedido.clientes?.nome_fantasia || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Nome Fantasia:</span>
            <span>{pedido.clientes?.nome_fantasia || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">CNPJ/CPF:</span>
            <span>{pedido.clientes?.cnpj_cpf || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Endereço:</span>
            <span>
              {pedido.clientes?.logradouro && `${pedido.clientes.logradouro}${pedido.clientes.numero ? ', ' + pedido.clientes.numero : ''}`}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Cidade/UF:</span>
            <span>{pedido.clientes?.cidade && pedido.clientes?.uf ? `${pedido.clientes.cidade} - ${pedido.clientes.uf}` : 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">CEP:</span>
            <span>{pedido.clientes?.cep || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Telefone:</span>
            <span>{pedido.clientes?.telefone || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Email:</span>
            <span>{pedido.clientes?.email || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Vendedor:</span>
            <span>{pedido.clientes?.profiles?.nome || 'N/A'}</span>
          </div>

          {pedido.observacoes && (
            <>
              <div className="section-title">Observações</div>
              <p style={{ fontSize: '12px', margin: '10px 0' }}>{pedido.observacoes}</p>
            </>
          )}

          <div className="section-title">Produtos</div>
          <table>
            <thead>
              <tr>
                <th>Ref.</th>
                <th>Descrição</th>
                <th>Quant.</th>
                <th>Valor Unit.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((produto, idx) => (
                <tr key={idx}>
                  <td>{produto.produtos?.sku || '-'}</td>
                  <td>{produto.produtos?.nome || 'N/A'}</td>
                  <td>{parseFloat(produto.quantidade || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td>{formatCurrency(parseFloat(produto.preco_unitario || 0))}</td>
                  <td>{formatCurrency(parseFloat(produto.quantidade || 0) * parseFloat(produto.preco_unitario || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="totals">
            <div className="total-row">
              <strong>Quantidade total:</strong> {quantidadeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="total-row">
              <strong>Sub total:</strong> {formatCurrency(subtotal)}
            </div>
            <div className="total-row">
              <strong>Forma de pagamento:</strong> {pedido.forma_pagamento?.toUpperCase() || 'N/A'}
            </div>
            {pedido.parcelas && (
              <div className="total-row">
                <strong>Parcelas:</strong> {pedido.parcelas}x
              </div>
            )}
            {pedido.dias_pagamento && (
              <div className="total-row">
                <strong>Prazo de pagamento:</strong> {pedido.dias_pagamento} dias
              </div>
            )}
            {pedido.tipo_frete && (
              <div className="total-row">
                <strong>Frete:</strong> {pedido.tipo_frete.toUpperCase()}
                {pedido.transportadora && ` - ${pedido.transportadora}`}
              </div>
            )}
            <div className="total-final">
              <strong>Total geral:</strong> {formatCurrency(subtotal)}
            </div>
          </div>

          <div style={{ marginTop: '40px', fontSize: '10px', textAlign: 'center', color: '#666' }}>
            Gerado em {new Date().toLocaleString('pt-BR')}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}