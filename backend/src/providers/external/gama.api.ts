import type { SimulationRequest } from "../../domain/simulation";
import { calcInstallment } from "../../shared/finances";
import { simulateNetwork, type NetworkOptions } from "./network";

export interface GamaResponse {
  resultado: "OK" | "NEGADO";
  detalhes: { motivo?: string; taxaMes?: string; valorParcela?: string };
}

const GAMA_NETWORK: NetworkOptions = {
  minLatencyMs: 300,
  maxLatencyMs: 1500,
  failureRate: 0.15,
};

const MONTHLY_RATE = 0.021;
const MAX_MARGIN = 0.4;
const MAX_AMOUNT = 50000;

export async function gamaApi(
  request: SimulationRequest,
  network: NetworkOptions = GAMA_NETWORK,
): Promise<GamaResponse> {
  await simulateNetwork(network);

  if (request.valorSolicitado > MAX_AMOUNT) {
    return { resultado: "NEGADO", detalhes: { motivo: "Valor acima do limite do banco" } };
  }

  const installment = calcInstallment(
    request.valorSolicitado,
    MONTHLY_RATE,
    request.prazoMeses,
  );

  if (installment > request.salario * MAX_MARGIN) {
    return { resultado: "NEGADO", detalhes: { motivo: "Parcela acima de 40% do salário" } };
  }

  return {
    resultado: "OK",
    detalhes: {
      taxaMes: `${(MONTHLY_RATE * 100).toFixed(2)}%`,
      valorParcela: `R$ ${installment.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    },
  };
}