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

const BASE_RATE = 0.021;
const RISK_SURCHARGE = 0.006; 
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

  const perfil = request.perfilCredito;
  const rate = !perfil || perfil.negativado ? BASE_RATE + RISK_SURCHARGE : BASE_RATE;

  const installment = calcInstallment(request.valorSolicitado, rate, request.prazoMeses);

  if (installment > request.salario * MAX_MARGIN) {
    return { resultado: "NEGADO", detalhes: { motivo: "Parcela acima de 40% do salário" } };
  }

  return {
    resultado: "OK",
    detalhes: {
      taxaMes: `${(rate * 100).toFixed(2)}%`,
      valorParcela: `R$ ${installment.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    },
  };
}