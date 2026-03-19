export const calcularPrecoPorDose = (
  precoKg: number,
  rendimentoDoseGramas: number
): number => {
  return (precoKg * rendimentoDoseGramas) / 1000;
};

export const calcularPrecoCaixa = (
  precoKg: number,
  pesoEmbalagem: number
): number => {
  return precoKg * pesoEmbalagem;
};

// FASE 2: Nova função para calcular preço total da embalagem
export const calcularPrecoEmbalagem = (
  precoKg: number,
  pesoEmbalagem: number,
  tipoVenda?: 'kg' | 'unidade'
): number => {
  // Para produtos vendidos por unidade, o preço já é o total
  if (tipoVenda === 'unidade') {
    return precoKg;
  }
  // Para produtos vendidos por kg, multiplicar pelo peso
  const peso = pesoEmbalagem || 1;
  return precoKg * peso;
};

// FASE 2: Formatar informações completas do produto
export const formatarInfoPreco = (produto: any): {
  precoKg: number;
  pesoEmbalagem: number;
  precoEmbalagem: number;
  precoDose?: number;
  rendimentoDose?: number;
  tipo: 'unika' | 'volatil' | 'normal';
  tipoVenda?: 'kg' | 'unidade';
} | null => {
  const marca = produto.marcas?.nome?.toUpperCase() || '';
  const tipoVenda = produto.tipo_venda || 'unidade';
  
  // Usar preço da tabela_site se existir, senão usar preco_por_kg do produto
  const precoKg = produto.tabela_site?.preco_por_kg || produto.preco_por_kg;
  const pesoEmb = produto.peso_embalagem_kg || (tipoVenda === 'kg' ? 1 : 1);
  const rendDose = produto.rendimento_dose_gramas;
  
  if (!precoKg) return null;
  
  const info = {
    precoKg,
    pesoEmbalagem: pesoEmb,
    precoEmbalagem: calcularPrecoEmbalagem(precoKg, pesoEmb, tipoVenda as 'kg' | 'unidade'),
    tipoVenda: tipoVenda as 'kg' | 'unidade',
  };
  
  // Se for UNIKA e tiver dose
  if (marca.includes('UNIKA') && rendDose) {
    return {
      ...info,
      precoDose: calcularPrecoPorDose(precoKg, rendDose),
      rendimentoDose: rendDose,
      tipo: 'unika' as const
    };
  }
  
  // Se for marca volátil (GENCAU/CACAU)
  if (isMarcaVolatil(marca)) {
    return {
      ...info,
      tipo: 'volatil' as const
    };
  }
  
  // Outras marcas
  return {
    ...info,
    tipo: 'normal' as const
  };
};

export const formatarPreco = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
};

export const marcasVolateis = ['CACAU FINO', 'CACAU'];

export const isMarcaVolatil = (marca: string): boolean => {
  return marcasVolateis.some(m => marca.toUpperCase().includes(m));
};

export const coresMarcas: Record<string, string> = {
  'CACAU FINO': 'bg-orange-500',
  'VELVET': 'bg-purple-500',
  'GLACIAL': 'bg-blue-500',
  'AURORA': 'bg-green-500',
  'TROPIK': 'bg-red-500',
  'DOLCE': 'bg-pink-500',
  'FROST': 'bg-gray-500',
  'CRISTAL': 'bg-cyan-500',
  'SUMMIT': 'bg-amber-500',
};

export const getCorMarca = (marca: string): string => {
  const marcaUpper = marca.toUpperCase();
  for (const [key, color] of Object.entries(coresMarcas)) {
    if (marcaUpper.includes(key)) return color;
  }
  return 'bg-primary';
};
