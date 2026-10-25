import type { BankProvider } from "./bank-provider";
import { AlfaProvider } from "./alfa.provider";
import { BetaProvider } from "./beta.provider";
import { GamaProvider } from "./gama.provider";

export function createDefaultProviders(): BankProvider[] {
  return [new AlfaProvider(), new BetaProvider(), new GamaProvider()];
}