export interface SimulationRequest {
  nome: string;
  email: string;
  cpf: string; 
  salario: number; 
  cnpjEmpregador: string; 
  valorSolicitado: number;
  prazoMeses: number;
} //cpf salario e cnpj sao so digitos

export type BankStatus = "APROVADO" | "REPROVADO" | "INDISPONIVEL";

export interface BankResult {
  banco: string;
  status: BankStatus;
  motivo?: string;
  taxaMensal?: number; 
  valorParcela?: number;
  valorTotal?: number;
}