import { randomUUID } from "node:crypto";
import type { PerfilCredito } from "../domain/credit-profile";
import type { BankResult, BankStatus, SimulationRequest } from "../domain/simulation";
import type { SimulationResponse } from "../domain/simulation-response";
import type { BankProvider } from "../providers/bank-provider";
import { BankIntegrationError } from "../shared/errors";
import { maskCpf } from "../shared/mask";
import { TimeoutError, withTimeout } from "../shared/timeout";
import type { CreditBureau } from "./credit-biro";

export interface SimulationServiceOptions {
  timeoutMs: number;
  retries: number;
}

const DEFAULT_OPTIONS: SimulationServiceOptions = { timeoutMs: 3000, retries: 1 };

const STATUS_ORDER: Record<BankStatus, number> = {
  APROVADO: 0,
  REPROVADO: 1,
  INDISPONIVEL: 2,
};

export class SimulationService {
  private readonly options: SimulationServiceOptions;

  constructor(
    private readonly providers: BankProvider[],
    options: Partial<SimulationServiceOptions> = {},
    private readonly bureau?: CreditBureau,
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async simulate(request: SimulationRequest): Promise<SimulationResponse> {
    const perfilCredito = await this.fetchCreditProfile(request.cpf);
    const enriched: SimulationRequest = { ...request, perfilCredito };

    const settled = await Promise.allSettled(
      this.providers.map((provider) => this.callWithRetry(provider, enriched)),
    );

    const resultados = settled
      .map((outcome, index) =>
        outcome.status === "fulfilled"
          ? outcome.value
          : this.unavailable(this.providers[index].name, outcome.reason),
      )
      .sort(
        (a, b) =>
          STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
          this.total(a) - this.total(b),
      );

    return {
      id: randomUUID(),
      criadoEm: new Date().toISOString(),
      solicitante: {
        nome: request.nome,
        email: request.email,
        cpf: maskCpf(request.cpf),
      },
      valorSolicitado: request.valorSolicitado,
      prazoMeses: request.prazoMeses,
      resultados,
      melhorOferta: resultados.find((r) => r.status === "APROVADO") ?? null,
      resumo: {
        aprovados: resultados.filter((r) => r.status === "APROVADO").length,
        reprovados: resultados.filter((r) => r.status === "REPROVADO").length,
        indisponiveis: resultados.filter((r) => r.status === "INDISPONIVEL").length,
      },
    };
  }

  private async fetchCreditProfile(cpf: string): Promise<PerfilCredito | undefined> {
    if (!this.bureau) return undefined;

    for (let attempt = 0; attempt <= this.options.retries; attempt++) {
      try {
        return await withTimeout(this.bureau.consultar(cpf), this.options.timeoutMs);
      } catch (error) {
        if (error instanceof TimeoutError) break; 
      }
    }
    return undefined;
  }

  private async callWithRetry(
    provider: BankProvider,
    request: SimulationRequest,
  ): Promise<BankResult> {
    let attempt = 0;
    for (;;) {
      try {
        return await withTimeout(provider.simulate(request), this.options.timeoutMs);
      } catch (error) {
        
        const retryable =
          !(error instanceof BankIntegrationError) && !(error instanceof TimeoutError);
        if (!retryable || attempt >= this.options.retries) throw error;
        attempt++;
      }
    }
  }

  private unavailable(banco: string, reason: unknown): BankResult {
    return {
      banco,
      status: "INDISPONIVEL",
      motivo:
        reason instanceof TimeoutError
          ? "O banco demorou demais para responder"
          : "Banco temporariamente indisponível",
    };
  }

  private total(result: BankResult): number {
    return result.valorTotal ?? Number.MAX_SAFE_INTEGER;
  }
}