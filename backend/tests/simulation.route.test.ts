import { describe, it, expect } from "vitest";
import { buildApp } from "../src/app";
import { SimulationService } from "../src/services/simulation.service";
import type { BankProvider } from "../src/providers/bank-provider";

const fake: BankProvider = {
  name: "Banco Fake",
  simulate: async () => ({
    banco: "Banco Fake",
    status: "APROVADO",
    valorParcela: 500,
    valorTotal: 12000,
  }),
};

const validBody = {
  nome: "Maria Silva",
  email: "maria@email.com",
  cpf: "529.982.247-25",
  salario: 3500,
  cnpjEmpregador: "11.222.333/0001-81",
  valorSolicitado: 10000,
  prazoMeses: 24,
};

describe("POST /simulations", () => {
  it("retorna 201 com o resultado de cada banco", async () => {
    const app = buildApp(new SimulationService([fake]), { logger: false });
    const res = await app.inject({ method: "POST", url: "/simulations", payload: validBody });

    expect(res.statusCode).toBe(201);
    expect(res.json().resultados).toHaveLength(1);
    expect(res.json().solicitante.cpf).toBe("***.982.247-**");
    await app.close();
  });

  it("retorna 400 com a mensagem de cada campo inválido", async () => {
    const app = buildApp(new SimulationService([fake]), { logger: false });
    const res = await app.inject({
      method: "POST",
      url: "/simulations",
      payload: { ...validBody, cpf: "123", prazoMeses: 2 },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().campos.cpf).toBe("CPF inválido");
    expect(res.json().campos.prazoMeses).toContain("mínimo");
    await app.close();
  });

  it("retorna 400 para JSON malformado", async () => {
    const app = buildApp(new SimulationService([fake]), { logger: false });
    const res = await app.inject({
      method: "POST",
      url: "/simulations",
      headers: { "content-type": "application/json" },
      payload: "{ quebrado",
    });

    expect(res.statusCode).toBe(400);
    await app.close();
  });
});