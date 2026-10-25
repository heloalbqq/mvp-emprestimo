import type { BankResult } from "./simulation";

export interface SimulationResponse {
  id: string;
  criadoEm: string;
  solicitante: { nome: string; email: string; cpf: string };
  valorSolicitado: number;
  prazoMeses: number;
  resultados: BankResult[];
  melhorOferta: BankResult | null;
  resumo: { aprovados: number; reprovados: number; indisponiveis: number };
}