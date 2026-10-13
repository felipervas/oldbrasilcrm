export type InscricaoEstadualLike = {
  inscricao_estadual?: string | number | null;
  ativo?: boolean | null;
  uf?: string | null;
  estado?: { sigla?: string | null } | null;
};

function normalizeUf(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export function pickInscricaoEstadual(inscricoes: unknown, uf?: string | null): string {
  if (!Array.isArray(inscricoes)) return "";

  const ativas = (inscricoes as InscricaoEstadualLike[]).filter((item) =>
    item?.inscricao_estadual != null &&
    String(item.inscricao_estadual).trim() !== "" &&
    item.ativo !== false
  );

  if (ativas.length === 0) return "";

  const ufAlvo = normalizeUf(uf);
  if (ufAlvo) {
    const mesmaUf = ativas.find((item) => normalizeUf(item?.estado?.sigla ?? item?.uf) === ufAlvo);
    if (mesmaUf?.inscricao_estadual != null) return String(mesmaUf.inscricao_estadual).trim();

    const temUfInformada = ativas.some((item) => normalizeUf(item?.estado?.sigla ?? item?.uf) !== "");
    if (temUfInformada) return "";
  }

  return String(ativas[0].inscricao_estadual).trim();
}
