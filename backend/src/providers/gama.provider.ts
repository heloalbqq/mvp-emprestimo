import type { BankResult, SimulationRequest } from "../domain/simulation";
import { BankIntegrationError } from "../shared/errors";
import { round2 } from "../shared/finances";
import type { BankProvider } from "./bank-provider";
import { gamaApi, type GamaResponse } from "./external/gama.api";

type GamaApi = (request: SimulationRequest) => Promise<GamaResponse>;

function parsePercent(text: string): number {
  const value = Number(text.replace("%", "").replace(",", ".").trim()) / 100;
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Taxa inválida: "${text}"`);
  }
  return value;
}

function parseBRL(text: string): number {
  const value = Number(text.replace(/[^\d,]/g, "").replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Valor inválido: "${text}"`);
  }
  return value;
}

export class GamaProvider implements BankProvider {
  readonly name = "Banco Gama";

  constructor(private readonly api: GamaApi = gamaApi) {}

  async simulate(request: SimulationRequest): Promise<BankResult> {
    const res = await this.api(request);

    if (res.resultado === "NEGADO") {
      return {
        banco: this.name,
        status: "REPROVADO",
        motivo: res.detalhes.motivo ?? "Proposta não aprovada",
      };
    }

    const { taxaMes, valorParcela } = res.detalhes;
    if (res.resultado === "OK" && taxaMes && valorParcela) {
      try {
        const parcela = parseBRL(valorParcela);
        return {
          banco: this.name,
          status: "APROVADO",
          taxaMensal: parsePercent(taxaMes),
          valorParcela: parcela,
          valorTotal: round2(parcela * request.prazoMeses),
        };
      } catch (cause) {
        throw new BankIntegrationError(this.name, "Resposta ilegível", { cause });
      }
    }

    throw new BankIntegrationError(this.name, "Resposta fora do contrato");
  }
}