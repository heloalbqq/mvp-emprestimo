import { describe, it, expect } from "vitest";
import type { PerfilCredito } from "../src/domain/credit-profile";
import type { SimulationRequest } from "../src/domain/simulation";
import type { BankProvider } from "../src/providers/bank-provider";
import { NO_NETWORK } from "../src/providers/external/network";
import { alfaApi } from "../src/providers/external/alfa.api";
import { betaApi } from "../src/providers/external/beta.api";
import { gamaApi } from "../src/providers/external/gama.api";
import { bureauApi } from "../src/providers/external/biro.api";
import { AlfaProvider } from "../src/providers/alfa.provider";
import { BetaProvider } from "../src/providers/beta.provider";
import { GamaProvider } from "../src/providers/gama.provider";
import { FakeCreditBureau, type CreditBureau } from "../src/services/credit-biro";
import { SimulationService } from "../src/services/simulation.service";

const base: SimulationRequest = {
  nome: "Maria Silva",
  email: "maria@email.com",
  cpf: "52998224725",
  salario: 3500,
  cnpjEmpregador: "11222333000181",
  valorSolicitado: 10000,
  prazoMeses: 24,
};

const comPerfil = (perfilCredito?: PerfilCredito): SimulationRequest => ({
  ...base,
  perfilCredito,
});

const bom: PerfilCredito = { negativado: false, score: 700 };
const negativado: PerfilCredito = { negativado: true, score: 300 };
const scoreBaixo: PerfilCredito = { negativado: false, score: 450 };

const alfa = new AlfaProvider((req) => alfaApi(req, NO_NETWORK));
const beta = new BetaProvider((req) => betaApi(req, NO_NETWORK));
const gama = new GamaProvider((req) => gamaApi(req, NO_NETWORK));

describe("política de crédito: Banco Alfa", () => {
  it("ignora a negativação (a garantia é o desconto em folha)", async () => {
    const r = await alfa.simulate(comPerfil(negativado));
    expect(r.status).toBe("APROVADO");
  });
});

describe("política de crédito: Banco Beta", () => {
  it("aprova cliente com bom perfil", async () => {
    expect((await beta.simulate(comPerfil(bom))).status).toBe("APROVADO");
  });

  it("reprova cliente negativado", async () => {
    const r = await beta.simulate(comPerfil(negativado));
    expect(r.status).toBe("REPROVADO");
    expect(r.motivo).toContain("Restrição");
  });

  it("reprova score abaixo do mínimo", async () => {
    const r = await beta.simulate(comPerfil(scoreBaixo));
    expect(r.status).toBe("REPROVADO");
    expect(r.motivo).toContain("Score");
  });

  it("aprova com score exatamente no mínimo", async () => {
    const r = await beta.simulate(comPerfil({ negativado: false, score: 500 }));
    expect(r.status).toBe("APROVADO");
  });

  it("sem consulta ao birô não decide: lança erro (vira indisponível)", async () => {
    await expect(beta.simulate(comPerfil(undefined))).rejects.toThrow("Sem dados");
  });
});

describe("política de crédito: Banco Gama", () => {
  it("cobra a taxa normal de quem tem bom perfil", async () => {
    const r = await gama.simulate(comPerfil(bom));
    expect(r.status).toBe("APROVADO");
    expect(r.taxaMensal).toBeCloseTo(0.021, 5);
  });

  it("aprova negativado, mas com taxa e parcela maiores", async () => {
    const normal = await gama.simulate(comPerfil(bom));
    const risco = await gama.simulate(comPerfil(negativado));
    expect(risco.status).toBe("APROVADO");
    expect(risco.taxaMensal).toBeCloseTo(0.027, 5);
    expect(risco.valorParcela!).toBeGreaterThan(normal.valorParcela!);
  });

  it("sem consulta ao birô, cobra como se fosse negativado", async () => {
    const r = await gama.simulate(comPerfil(undefined));
    expect(r.taxaMensal).toBeCloseTo(0.027, 5);
  });
});

function makeBureau(behavior: PerfilCredito | "falha" | "travado") {
  const state = { calls: 0 };
  const bureau: CreditBureau = {
    consultar: () => {
      state.calls++;
      if (behavior === "falha") return Promise.reject(new Error("birô fora do ar"));
      if (behavior === "travado") return new Promise<PerfilCredito>(() => {});
      return Promise.resolve(behavior);
    },
  };
  return { bureau, state };
}

function makeSpy(name = "Banco Espião") {
  const state: { received?: SimulationRequest; calls: number } = { calls: 0 };
  const provider: BankProvider = {
    name,
    simulate: async (req) => {
      state.calls++;
      state.received = req;
      return { banco: name, status: "REPROVADO", motivo: "teste" };
    },
  };
  return { provider, state };
}

describe("SimulationService com birô", () => {
  it("entrega o perfil do birô aos bancos", async () => {
    const { bureau } = makeBureau(negativado);
    const { provider, state } = makeSpy();
    await new SimulationService([provider], {}, bureau).simulate(base);

    expect(state.received?.perfilCredito).toEqual(negativado);
  });

  it("consulta o birô uma única vez, mesmo com vários bancos", async () => {
    const { bureau, state } = makeBureau(bom);
    const spies = [makeSpy("A"), makeSpy("B"), makeSpy("C")];
    await new SimulationService(spies.map((s) => s.provider), {}, bureau).simulate(base);

    expect(state.calls).toBe(1);
  });

  it("segue sem perfil quando o birô falha", async () => {
    const { bureau } = makeBureau("falha");
    const { provider, state } = makeSpy();
    const res = await new SimulationService([provider], { retries: 0 }, bureau).simulate(base);

    expect(state.received?.perfilCredito).toBeUndefined();
    expect(res.resultados).toHaveLength(1);
  });

  it("não fica esperando um birô que travou", async () => {
    const { bureau } = makeBureau("travado");
    const { provider, state } = makeSpy();
    const start = Date.now();
    await new SimulationService([provider], { timeoutMs: 50 }, bureau).simulate(base);

    expect(Date.now() - start).toBeLessThan(1000);
    expect(state.received?.perfilCredito).toBeUndefined();
  });

  it("funciona sem birô configurado", async () => {
    const { provider, state } = makeSpy();
    await new SimulationService([provider]).simulate(base);

    expect(state.calls).toBe(1);
    expect(state.received?.perfilCredito).toBeUndefined();
  });
});

describe("fluxo completo com os três bancos", () => {
  const service = new SimulationService(
    [alfa, beta, gama],
    { retries: 0 },
    new FakeCreditBureau((cpf) => bureauApi(cpf, NO_NETWORK)),
  );
  const find = (res: Awaited<ReturnType<typeof service.simulate>>, banco: string) =>
    res.resultados.find((r) => r.banco === banco);

  it("CPF negativado: Alfa aprova, Beta reprova, Gama aprova com taxa maior", async () => {
    const res = await service.simulate({ ...base, cpf: "98765432100" });

    expect(find(res, "Banco Alfa")?.status).toBe("APROVADO");
    expect(find(res, "Banco Beta")?.status).toBe("REPROVADO");
    expect(find(res, "Banco Gama")?.status).toBe("APROVADO");
    expect(find(res, "Banco Gama")?.taxaMensal).toBeCloseTo(0.027, 5);
  });

  it("CPF com score baixo: só o Beta reprova", async () => {
    const res = await service.simulate({ ...base, cpf: "14725836982" });

    expect(find(res, "Banco Alfa")?.status).toBe("APROVADO");
    expect(find(res, "Banco Beta")?.motivo).toContain("Score");
    expect(find(res, "Banco Gama")?.taxaMensal).toBeCloseTo(0.021, 5);
  });

  it("CPF com bom perfil: os três aprovam", async () => {
    const res = await service.simulate(base);

    expect(res.resumo).toEqual({ aprovados: 3, reprovados: 0, indisponiveis: 0 });
  });

  it("birô fora do ar: Beta fica indisponível, Gama cobra taxa de risco", async () => {
    const semBireau = new SimulationService(
      [alfa, beta, gama],
      { retries: 0 },
      makeBureau("falha").bureau,
    );
    const res = await semBireau.simulate(base);

    expect(find(res, "Banco Alfa")?.status).toBe("APROVADO");
    expect(find(res, "Banco Beta")?.status).toBe("INDISPONIVEL");
    expect(find(res, "Banco Gama")?.taxaMensal).toBeCloseTo(0.027, 5);
  });
});