import { describe, expect, it } from "vitest";
import { pickInscricaoEstadual } from "../../supabase/functions/consulta-cnpj/ie";

describe("pickInscricaoEstadual", () => {
  it("prioriza IE ativa do mesmo estado do estabelecimento", () => {
    expect(pickInscricaoEstadual([
      { inscricao_estadual: "111", ativo: true, estado: { sigla: "SP" } },
      { inscricao_estadual: "222", ativo: true, estado: { sigla: "SC" } },
    ], "sc")).toBe("222");
  });

  it("não usa IE ativa de outro estado quando a UF é conhecida", () => {
    expect(pickInscricaoEstadual([
      { inscricao_estadual: "111", ativo: true, estado: { sigla: "SP" } },
    ], "SC")).toBe("");
  });

  it("ignora inscrições inativas", () => {
    expect(pickInscricaoEstadual([
      { inscricao_estadual: "111", ativo: false, estado: { sigla: "SC" } },
      { inscricao_estadual: "222", ativo: true, estado: { sigla: "SC" } },
    ], "SC")).toBe("222");
  });

  it("usa a primeira IE ativa quando a fonte não informa estado", () => {
    expect(pickInscricaoEstadual([
      { inscricao_estadual: "333", ativo: true },
    ], "SC")).toBe("333");
  });
});
