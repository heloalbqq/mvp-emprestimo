import { describe, it, expect } from "vitest";
import { isValidCpf } from "../src/validators/cpf";
import { isValidCnpj } from "../src/validators/cnpj";
import { simulationSchema } from "../src/validators/simulation.schema";
import { maskCpf } from "../src/shared/mask";

describe("isValidCpf", () => {
  it("aceita CPF válido com e sem máscara", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
  });
  it("rejeita dígito verificador errado e sequências repetidas", () => {
    expect(isValidCpf("529.982.247-24")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
  });
});

describe("isValidCnpj", () => {
  it("aceita CNPJ válido", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
  });
  it("rejeita CNPJ inválido", () => {
    expect(isValidCnpj("11.222.333/0001-82")).toBe(false);
    expect(isValidCnpj("00000000000000")).toBe(false);
  });
});

describe("simulationSchema", () => {
  const valid = {
    nome: "Maria Silva",
    email: "Maria@Email.com",
    cpf: "529.982.247-25",
    salario: 3500,
    cnpjEmpregador: "11.222.333/0001-81",
    valorSolicitado: 10000,
    prazoMeses: 24,
  };

  it("normaliza CPF, CNPJ e e-mail", () => {
    const result = simulationSchema.parse(valid);
    expect(result.cpf).toBe("52998224725");
    expect(result.cnpjEmpregador).toBe("11222333000181");
    expect(result.email).toBe("maria@email.com");
  });

  it("reprova dados inválidos", () => {
    const result = simulationSchema.safeParse({ ...valid, cpf: "000", prazoMeses: 2 });
    expect(result.success).toBe(false);
  });
});

describe("maskCpf", () => {
  it("esconde parte do CPF", () => {
    expect(maskCpf("52998224725")).toBe("***.982.247-**");
  });
});