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

export const formatarPreco = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
};

export const marcasVolateis = ['GENCAU', 'CACAU'];

export const isMarcaVolatil = (marca: string): boolean => {
  return marcasVolateis.some(m => marca.toUpperCase().includes(m));
};

export const coresMarcas: Record<string, string> = {
  'GENCAU': 'bg-orange-500',
  'UNIKA': 'bg-purple-500',
  'NELISUL': 'bg-blue-500',
  'VACCARIN': 'bg-green-500',
  'WUDY': 'bg-red-500',
  'BUONO': 'bg-pink-500',
  'PLUSPACK': 'bg-gray-500',
};

export const getCorMarca = (marca: string): string => {
  const marcaUpper = marca.toUpperCase();
  for (const [key, color] of Object.entries(coresMarcas)) {
    if (marcaUpper.includes(key)) return color;
  }
  return 'bg-primary';
};
