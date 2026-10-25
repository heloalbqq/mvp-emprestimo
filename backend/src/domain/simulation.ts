import type { PerfilCredito } from "./credit-profile";

export interface SimulationRequest {
  nome: string;
  email: string;
  cpf: string; 
  salario: number; 
  cnpjEmpregador: string; 
  valorSolicitado: number;
  prazoMeses: number;
  perfilCredito?: PerfilCredito; 
}

export type BankStatus = "APROVADO" | "REPROVADO" | "INDISPONIVEL";

export interface BankResult {
  banco: string;
  status: BankStatus;
  motivo?: string;
  taxaMensal?: number; 
  valorParcela?: number;
  valorTotal?: number;
}