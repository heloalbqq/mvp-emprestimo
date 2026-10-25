export type BankStatus = "APROVADO" | "REPROVADO" | "INDISPONIVEL";

export interface BankResult {
  banco: string;
  status: BankStatus;
  motivo?: string;
  taxaMensal?: number;
  valorParcela?: number;
  valorTotal?: number;
}

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

export interface SimulationPayload {
  nome: string;
  email: string;
  cpf: string;
  cnpjEmpregador: string;
  salario: number | null;
  valorSolicitado: number | null;
  prazoMeses: number | null;
}