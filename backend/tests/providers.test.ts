import { describe, it, expect } from "vitest";
import type { SimulationRequest } from "../src/domain/simulation";
import { annualToMonthly, calcInstallment } from "../src/shared/finances";
import { NO_NETWORK } from "../src/providers/external/network";
import { alfaApi } from "../src/providers/external/alfa.api";
import { betaApi } from "../src/providers/external/beta.api";
import { gamaApi } from "../src/providers/external/gama.api";
import { AlfaProvider } from "../src/providers/alfa.provider";
import { BetaProvider } from "../src/providers/beta.provider";
import { GamaProvider } from "../src/providers/gama.provider";

const base: SimulationRequest = {
  nome: "Maria Silva",
  email: "maria@email.com",
  cpf: "52998224725",
  salario: 3500,
  cnpjEmpregador: "11222333000181",
  valorSolicitado: 10000,
  prazoMeses: 24,
  perfilCredito: { negativado: false, score: 700 },
};

const alfa = new AlfaProvider((req) => alfaApi(req, NO_NETWORK));
const beta = new BetaProvider((req) => betaApi(req, NO_NETWORK));
const gama = new GamaProvider((req) => gamaApi(req, NO_NETWORK));

describe("finance", () => {
  it("calcula a parcela pela tabela Price", () => {
    expect(calcInstallment(10000, 0.02, 12)).toBe(945.6);
  });
  it("converte taxa anual em mensal equivalente", () => {
    expect((1 + annualToMonthly(0.2)) ** 12).toBeCloseTo(1.2, 10);
  });
});

describe("Banco Alfa", () => {
  it("aprova quando a parcela cabe na margem", async () => {
    const r = await alfa.simulate(base);
    expect(r.status).toBe("APROVADO");
    expect(r.banco).toBe("Banco Alfa");
    expect(r.valorParcela).toBeGreaterThan(0);
  });
  it("reprova quando a parcela estoura a margem", async () => {
    const r = await alfa.simulate({ ...base, valorSolicitado: 100000 });
    expect(r.status).toBe("REPROVADO");
    expect(r.motivo).toContain("35%");
  });
  it("lança erro se a resposta vier fora do contrato", async () => {
    const broken = new AlfaProvider(async () => ({ status: "APPROVED" }));
    await expect(broken.simulate(base)).rejects.toThrow("fora do contrato");
  });
});

describe("Banco Beta", () => {
  it("aprova e converte a taxa anual para mensal", async () => {
    const r = await beta.simulate(base);
    expect(r.status).toBe("APROVADO");
    expect(r.taxaMensal).toBeCloseTo(0.018, 3);
  });
  it("reprova renda abaixo do mínimo", async () => {
    const r = await beta.simulate({ ...base, salario: 1800, valorSolicitado: 1000 });
    expect(r.status).toBe("REPROVADO");
    expect(r.motivo).toContain("Renda");
  });
  it("lança erro se aprovar sem oferta", async () => {
    const broken = new BetaProvider(async () => ({ codigoRetorno: 0, mensagem: "ok" }));
    await expect(broken.simulate(base)).rejects.toThrow("fora do contrato");
  });
});

describe("Banco Gama", () => {
  it("aprova e interpreta os textos da resposta", async () => {
    const r = await gama.simulate(base);
    expect(r.status).toBe("APROVADO");
    expect(r.taxaMensal).toBeCloseTo(0.021, 5);
    expect(r.valorTotal).toBeCloseTo((r.valorParcela ?? 0) * 24, 1);
  });
  it("reprova valor acima do limite", async () => {
    const r = await gama.simulate({ ...base, valorSolicitado: 60000, salario: 20000 });
    expect(r.status).toBe("REPROVADO");
    expect(r.motivo).toContain("limite");
  });
  it("lança erro se os textos forem ilegíveis", async () => {
    const broken = new GamaProvider(async () => ({
      resultado: "OK",
      detalhes: { taxaMes: "abc", valorParcela: "R$ 100,00" },
    }));
    await expect(broken.simulate(base)).rejects.toThrow("ilegível");
  });
});