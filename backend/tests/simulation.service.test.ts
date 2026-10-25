import { describe, it, expect } from "vitest";
import type { BankResult, SimulationRequest } from "../src/domain/simulation";
import type { BankProvider } from "../src/providers/bank-provider";
import { SimulationService } from "../src/services/simulation.service";
import { BankIntegrationError } from "../src/shared/errors";

const request: SimulationRequest = {
  nome: "Maria Silva",
  email: "maria@email.com",
  cpf: "52998224725",
  salario: 3500,
  cnpjEmpregador: "11222333000181",
  valorSolicitado: 10000,
  prazoMeses: 24,
};

const approved = (name: string, total: number): BankProvider => ({
  name,
  simulate: async () => ({
    banco: name,
    status: "APROVADO",
    valorParcela: total / 24,
    valorTotal: total,
  }),
});

const denied = (name: string): BankProvider => ({
  name,
  simulate: async () => ({ banco: name, status: "REPROVADO", motivo: "Sem margem" }),
});

const failing = (name: string, error: Error): BankProvider => ({
  name,
  simulate: async () => {
    throw error;
  },
});

describe("SimulationService", () => {
  it("consolida os resultados, ordena e destaca a melhor oferta", async () => {
    const service = new SimulationService([
      denied("Banco A"),
      approved("Banco B", 14000),
      approved("Banco C", 12000),
    ]);
    const res = await service.simulate(request);

    expect(res.resultados.map((r) => r.banco)).toEqual(["Banco C", "Banco B", "Banco A"]);
    expect(res.melhorOferta?.banco).toBe("Banco C");
    expect(res.resumo).toEqual({ aprovados: 2, reprovados: 1, indisponiveis: 0 });
  });

  it("a falha de um banco não derruba a simulação", async () => {
    const service = new SimulationService(
      [approved("Banco A", 12000), failing("Banco B", new BankIntegrationError("Banco B", "quebrou"))],
      { retries: 0 },
    );
    const res = await service.simulate(request);

    expect(res.resultados).toHaveLength(2);
    expect(res.resultados.find((r) => r.banco === "Banco B")?.status).toBe("INDISPONIVEL");
    expect(res.melhorOferta?.banco).toBe("Banco A");
  });

  it("marca como indisponível o banco que estoura o timeout", async () => {
    const slow: BankProvider = {
      name: "Banco Lento",
      simulate: () => new Promise<BankResult>(() => {}),
    };
    const service = new SimulationService([slow], { timeoutMs: 50 });
    const res = await service.simulate(request);

    expect(res.resultados[0].status).toBe("INDISPONIVEL");
    expect(res.resultados[0].motivo).toContain("demorou");
  });

  it("tenta de novo quando a falha é de rede", async () => {
    let calls = 0;
    const flaky: BankProvider = {
      name: "Banco Instável",
      simulate: async () => {
        calls++;
        if (calls === 1) throw new Error("falha de rede");
        return { banco: "Banco Instável", status: "APROVADO", valorParcela: 500, valorTotal: 12000 };
      },
    };
    const res = await new SimulationService([flaky], { retries: 1 }).simulate(request);

    expect(calls).toBe(2);
    expect(res.resultados[0].status).toBe("APROVADO");
  });

  it("não tenta de novo quando a resposta veio fora do contrato", async () => {
    let calls = 0;
    const broken: BankProvider = {
      name: "Banco Quebrado",
      simulate: async () => {
        calls++;
        throw new BankIntegrationError("Banco Quebrado", "fora do contrato");
      },
    };
    await new SimulationService([broken], { retries: 3 }).simulate(request);

    expect(calls).toBe(1);
  });

  it("devolve melhorOferta nula quando todos os bancos falham", async () => {
    const service = new SimulationService([failing("Banco A", new Error("x"))], { retries: 0 });
    const res = await service.simulate(request);

    expect(res.melhorOferta).toBeNull();
    expect(res.resumo.indisponiveis).toBe(1);
  });

  it("mascara o CPF na resposta", async () => {
    const res = await new SimulationService([approved("Banco A", 12000)]).simulate(request);

    expect(res.solicitante.cpf).toBe("***.982.247-**");
  });
});