import type { BankResult, SimulationRequest } from "../domain/simulation";
import { BankIntegrationError } from "../shared/errors";
import { annualToMonthly } from "../shared/finances";
import type { BankProvider } from "./bank-provider";
import { betaApi, type BetaResponse } from "./external/beta.api";

type BetaApi = (request: SimulationRequest) => Promise<BetaResponse>;

export class BetaProvider implements BankProvider {
  readonly name = "Banco Beta";

  constructor(private readonly api: BetaApi = betaApi) {}

  async simulate(request: SimulationRequest): Promise<BankResult> {
    const res = await this.api(request);

    if (res.codigoRetorno === 0 && res.oferta) {
      return {
        banco: this.name,
        status: "APROVADO",
        taxaMensal: annualToMonthly(res.oferta.taxaAnual),
        valorParcela: res.oferta.parcela,
        valorTotal: res.oferta.valorTotal,
      };
    }

    if (res.codigoRetorno === 1 || res.codigoRetorno === 2) {
      return { banco: this.name, status: "REPROVADO", motivo: res.mensagem };
    }

    throw new BankIntegrationError(this.name, "Resposta fora do contrato");
  }
}