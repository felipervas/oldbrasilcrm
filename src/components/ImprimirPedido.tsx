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

    const printWindow = window.open('', '', 'height=900,width=800');
    if (!printWindow) return;

    printWindow.document.write('<html><head><title>Pedido</title>');
    printWindow.document.write(`
      <style>
        @page { size: A4; margin: 15mm; }
        body { 
          font-family: Arial, sans-serif; 
          padding: 0;
          margin: 0;
          color: #000;
          font-size: 11pt;
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #000;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .logo {
          max-width: 180px;
          height: auto;
          margin-bottom: 10px;
        }
        .company-info {
          font-size: 10pt;
          line-height: 1.5;
          margin-top: 8px;
        }
        .company-name {
          font-weight: bold;
          font-size: 12pt;
          margin-bottom: 4px;
        }
        .pedido-info {
          text-align: center;
          font-size: 13pt;
          font-weight: bold;
          margin: 15px 0;
          padding: 8px;
          background: #f5f5f5;
          border-radius: 4px;
        }
        .section-title {
          font-size: 12pt;
          font-weight: bold;
          margin: 18px 0 8px 0;
          padding-bottom: 4px;
          border-bottom: 2px solid #666;
          color: #333;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 150px 1fr;
          gap: 6px 12px;
          margin: 10px 0;
          font-size: 10pt;
        }
        .info-label {
          font-weight: bold;
          color: #444;
        }
        .info-value {
          color: #000;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: 10pt;
        }
        th {
          background-color: #e8e8e8;
          font-weight: bold;
          padding: 10px 8px;
          text-align: left;
          border: 1px solid #999;
        }
        td {
          border: 1px solid #ccc;
          padding: 8px;
          vertical-align: top;
        }
        .totals-box {
          margin-top: 20px;
          border: 2px solid #000;
          padding: 12px;
          background: #f9f9f9;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin: 6px 0;
          font-size: 11pt;
        }
        .total-final {
          display: flex;
          justify-content: space-between;
          font-size: 14pt;
          font-weight: bold;
          border-top: 2px solid #000;
          padding-top: 10px;
          margin-top: 10px;
        }
        .footer {
          margin-top: 30px;
          font-size: 9pt;
          text-align: center;
          color: #666;
          border-top: 1px solid #ccc;
          padding-top: 10px;
        }
        .obs-box {
          border: 1px solid #ccc;
          padding: 10px;
          background: #fafafa;
          margin: 10px 0;
          font-size: 10pt;
        }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
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
              <div className="company-name">DALBERTO VASCONCELLOS LTDA - OLD Brasil</div>
              CPF/CNPJ: 59.224.429/0001-05<br />
              RUA BAHIA, 34 - CXPST 03 UNIVERSITARIO - Tijucas - SC - CEP: 88200-000<br />
              Fones: (47)99155-0525 (47)99231-0525<br />
              oldvasconcellos@gmail.com
            </div>
          </div>

          <div className="pedido-info">
            Pedido: {pedido.numero_pedido || 'N/A'} - Criação: {pedido.data_pedido ? new Date(pedido.data_pedido).toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR') : 'N/A'}
          </div>

          <div className="section-title"># Dados cadastrais:</div>
          <div className="info-grid">
            <span className="info-label">Nome:</span>
            <span className="info-value">{pedido.clientes?.razao_social || pedido.clientes?.nome_fantasia || 'N/A'}</span>
            
            <span className="info-label">Fantasia:</span>
            <span className="info-value">{pedido.clientes?.nome_fantasia || 'N/A'}</span>
            
            <span className="info-label">CPF/CNPJ:</span>
            <span className="info-value">{pedido.clientes?.cnpj_cpf || 'N/A'}</span>
            
            <span className="info-label">Endereço:</span>
            <span className="info-value">
              {pedido.clientes?.logradouro ? `${pedido.clientes.logradouro}${pedido.clientes.numero ? ', ' + pedido.clientes.numero : ''}` : 'N/A'}
            </span>
            
            <span className="info-label">Bairro:</span>
            <span className="info-value">{pedido.clientes?.cidade || 'N/A'}</span>
            
            <span className="info-label">Cidade:</span>
            <span className="info-value">{pedido.clientes?.cidade && pedido.clientes?.uf ? `${pedido.clientes.cidade} - ${pedido.clientes.uf}` : 'N/A'}</span>
            
            <span className="info-label">CEP:</span>
            <span className="info-value">{pedido.clientes?.cep || 'N/A'}</span>
            
            <span className="info-label">Telefone:</span>
            <span className="info-value">{pedido.clientes?.telefone || 'N/A'}</span>
            
            <span className="info-label">Email:</span>
            <span className="info-value">{pedido.clientes?.email || 'N/A'}</span>
            
            <span className="info-label">Vendedor:</span>
            <span className="info-value">{pedido.clientes?.profiles?.nome || 'N/A'}</span>
          </div>

          {pedido.observacoes && (
            <>
              <div className="section-title"># Observações:</div>
              <div className="obs-box">{pedido.observacoes}</div>
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

          <div className="totals-box">
            <div className="total-row">
              <span>Quantidade total:</span>
              <span>{quantidadeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="total-row">
              <span>Sub total:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="total-row">
              <span>Forma de pagamento:</span>
              <span>{pedido.forma_pagamento?.toUpperCase() || 'N/A'}</span>
            </div>
            {pedido.parcelas && (
              <div className="total-row">
                <span>Parcelas:</span>
                <span>{pedido.parcelas}x</span>
              </div>
            )}
            {pedido.dias_pagamento && (
              <div className="total-row">
                <span>Prazo de pagamento:</span>
                <span>{pedido.dias_pagamento} dias</span>
              </div>
            )}
            {pedido.tipo_frete && (
              <div className="total-row">
                <span>Frete:</span>
                <span>{pedido.tipo_frete.toUpperCase()}{pedido.transportadora && ` - ${pedido.transportadora}`}</span>
              </div>
            )}
            {pedido.transportadora && !pedido.tipo_frete && (
              <div className="total-row">
                <span>Transporte:</span>
                <span>{pedido.transportadora}</span>
              </div>
            )}
            <div className="total-final">
              <span>Total geral:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="total-row" style={{ marginTop: '8px', fontSize: '10pt' }}>
              <span>Pago:</span>
              <span>R$ 0,00</span>
            </div>
          </div>

          <div className="footer">
            Gerado em {new Date().toLocaleString('pt-BR')} por OLD Brasil
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