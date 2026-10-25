import type { SimulationRequest } from "../../domain/simulation";
import { annualToMonthly, calcInstallment, round2 } from "../../shared/finances";
import { DEFAULT_NETWORK, simulateNetwork, type NetworkOptions } from "./network";

export interface BetaResponse {
  codigoRetorno: 0 | 1 | 2;
  mensagem: string;
  oferta?: { taxaAnual: number; parcela: number; valorTotal: number };
}

const ANNUAL_RATE = 0.2388;
const MAX_MARGIN = 0.3;
const MIN_SALARY = 2000;

export async function betaApi(
  request: SimulationRequest,
  network: NetworkOptions = DEFAULT_NETWORK,
): Promise<BetaResponse> {
  await simulateNetwork(network);

  if (request.salario < MIN_SALARY) {
    return { codigoRetorno: 2, mensagem: "Renda inferior ao mínimo exigido (R$ 2.000)" };
  }

  const installment = calcInstallment(
    request.valorSolicitado,
    annualToMonthly(ANNUAL_RATE),
    request.prazoMeses,
  );

  if (installment > request.salario * MAX_MARGIN) {
    return { codigoRetorno: 1, mensagem: "Parcela excede 30% da renda" };
  }

  return {
    codigoRetorno: 0,
    mensagem: "Aprovado",
    oferta: {
      taxaAnual: ANNUAL_RATE,
      parcela: installment,
      valorTotal: round2(installment * request.prazoMeses),
    },
  };
}