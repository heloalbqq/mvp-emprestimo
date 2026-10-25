import type { BankResult, SimulationRequest } from "../domain/simulation";

export interface BankProvider {
  readonly name: string;
  simulate(request: SimulationRequest): Promise<BankResult>;
}