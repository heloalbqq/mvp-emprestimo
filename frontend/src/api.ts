import type { SimulationPayload, SimulationResponse } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export class ValidationError extends Error {
  readonly campos: Record<string, string>;

  constructor(campos: Record<string, string>) {
    super("Dados inválidos");
    this.name = "ValidationError";
    this.campos = campos;
  }
}

export async function createSimulation(
  payload: SimulationPayload,
): Promise<SimulationResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/simulations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
    );
  }

  if (res.status === 400) {
    const data = await res.json();
    throw new ValidationError(data.campos ?? {});
  }
  if (!res.ok) {
    throw new Error(
      "Não foi possível concluir a simulação agora. Tente novamente em instantes.",
    );
  }
  return res.json();
}