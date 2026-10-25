import { simulateNetwork, type NetworkOptions } from "./network";

export interface BureauResponse {
  possuiRestricao: boolean;
  pontuacao: number;
}

const BUREAU_NETWORK: NetworkOptions = {
  minLatencyMs: 100,
  maxLatencyMs: 600,
  failureRate: 0.05,
};

export async function bureauApi(
  cpf: string,
  network: NetworkOptions = BUREAU_NETWORK,
): Promise<BureauResponse> {
  await simulateNetwork(network);

  if (!/^\d{11}$/.test(cpf)) {
    throw new Error("CPF mal formado");
  }

  const lastDigit = Number(cpf[10]);
  return {
    possuiRestricao: lastDigit <= 1,
    pontuacao: 250 + lastDigit * 75, // 250 a 925
  };
}