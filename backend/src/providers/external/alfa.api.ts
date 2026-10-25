import type { SimulationRequest } from "../../domain/simulation";
import { calcInstallment, round2 } from "../../shared/finances";
import { DEFAULT_NETWORK, simulateNetwork, type NetworkOptions } from "./network";

export interface AlfaResponse {
  status: "APPROVED" | "DENIED";
  reason?: string;
  data?: { monthly_rate: number; installment: number; total_amount: number };
}

const MONTHLY_RATE = 0.0179;
const MAX_MARGIN = 0.35;

export async function alfaApi(
  request: SimulationRequest,
  network: NetworkOptions = DEFAULT_NETWORK,
): Promise<AlfaResponse> {
  await simulateNetwork(network);

  const installment = calcInstallment(
    request.valorSolicitado,
    MONTHLY_RATE,
    request.prazoMeses,
  );

  if (installment > request.salario * MAX_MARGIN) {
    return { status: "DENIED", reason: "MARGIN_EXCEEDED" };
  }

  return {
    status: "APPROVED",
    data: {
      monthly_rate: MONTHLY_RATE,
      installment,
      total_amount: round2(installment * request.prazoMeses),
    },
  };
}