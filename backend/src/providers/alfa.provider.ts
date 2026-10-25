import type { BankResult, SimulationRequest } from "../domain/simulation";
import { BankIntegrationError } from "../shared/errors";
import type { BankProvider } from "./bank-provider";
import { alfaApi, type AlfaResponse } from "./external/alfa.api";

type AlfaApi = (request: SimulationRequest) => Promise<AlfaResponse>;

const REASONS: Record<string, string> = {
  MARGIN_EXCEEDED: "Parcela acima de 35% do salário",
};

export class AlfaProvider implements BankProvider {
  readonly name = "Banco Alfa";

  constructor(private readonly api: AlfaApi = alfaApi) {}

  async simulate(request: SimulationRequest): Promise<BankResult> {
    const res = await this.api(request);

    if (res.status === "DENIED") {
      return {
        banco: this.name,
        status: "REPROVADO",
        motivo: REASONS[res.reason ?? ""] ?? "Proposta não aprovada",
      };
    }

    if (res.status === "APPROVED" && res.data) {
      return {
        banco: this.name,
        status: "APROVADO",
        taxaMensal: res.data.monthly_rate,
        valorParcela: res.data.installment,
        valorTotal: res.data.total_amount,
      };
    }

    throw new BankIntegrationError(this.name, "Resposta fora do contrato");
  }
}