import type { PerfilCredito } from "../domain/credit-profile";
import { bureauApi, type BureauResponse } from "../providers/external/biro.api";

export interface CreditBureau {
  consultar(cpf: string): Promise<PerfilCredito>;
}

type BureauApi = (cpf: string) => Promise<BureauResponse>;

export class FakeCreditBureau implements CreditBureau {
  constructor(private readonly api: BureauApi = bureauApi) {}

  async consultar(cpf: string): Promise<PerfilCredito> {
    const res = await this.api(cpf);

    if (typeof res.possuiRestricao !== "boolean" || !Number.isFinite(res.pontuacao)) {
      throw new Error("Resposta do birô fora do contrato");
    }

    return { negativado: res.possuiRestricao, score: res.pontuacao };
  }
}