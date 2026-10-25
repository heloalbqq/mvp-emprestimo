import { z } from "zod";
import { onlyDigits } from "../shared/digits";
import { isValidCpf } from "./cpf";
import { isValidCnpj } from "./cnpj";

export const simulationSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(3, "Informe o nome completo")
    .max(120, "Nome muito longo"),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  cpf: z
    .string()
    .refine(isValidCpf, "CPF inválido")
    .transform(onlyDigits),
  salario: z
    .number({ message: "Informe o salário" })
    .positive("O salário deve ser maior que zero"),
  cnpjEmpregador: z
    .string()
    .refine(isValidCnpj, "CNPJ do empregador inválido")
    .transform(onlyDigits),
  valorSolicitado: z
    .number({ message: "Informe o valor desejado" })
    .min(500, "Valor mínimo: R$ 500")
    .max(200000, "Valor máximo: R$ 200.000"),
  prazoMeses: z
    .number({ message: "Informe o prazo" })
    .int("O prazo deve ser em meses inteiros")
    .min(6, "Prazo mínimo: 6 meses")
    .max(96, "Prazo máximo: 96 meses"),
});