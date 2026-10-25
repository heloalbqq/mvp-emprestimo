import { describe, it, expect } from "vitest";
import { bureauApi } from "../src/providers/external/biro.api";
import { NO_NETWORK } from "../src/providers/external/network";
import { FakeCreditBureau } from "../src/services/credit-biro";

const bureau = new FakeCreditBureau((cpf) => bureauApi(cpf, NO_NETWORK));

describe("birô de crédito fictício", () => {
  it("devolve sempre o mesmo resultado para o mesmo CPF", async () => {
    const a = await bureau.consultar("52998224725");
    const b = await bureau.consultar("52998224725");
    expect(a).toEqual(b);
  });

  it("CPFs terminados em 0 ou 1 são negativados", async () => {
    expect(await bureau.consultar("98765432100")).toEqual({ negativado: true, score: 250 });
    expect((await bureau.consultar("32165498791")).negativado).toBe(true);
  });

  it("CPF terminado em 2 não é negativado, mas tem score baixo", async () => {
    expect(await bureau.consultar("14725836982")).toEqual({ negativado: false, score: 400 });
  });

  it("CPF terminado em 5 tem score bom", async () => {
    expect(await bureau.consultar("52998224725")).toEqual({ negativado: false, score: 625 });
  });

  it("rejeita CPF mal formado", async () => {
    await expect(bureau.consultar("123")).rejects.toThrow("mal formado");
  });

  it("lança erro quando a resposta vem fora do contrato", async () => {
    const broken = new FakeCreditBureau((async () => ({
      possuiRestricao: "sim",
      pontuacao: 700,
    })) as never);
    await expect(broken.consultar("52998224725")).rejects.toThrow("fora do contrato");
  });
});