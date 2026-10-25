export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function annualToMonthly(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

// Parcela fixa (tabela Price)
export function calcInstallment(
  principal: number,
  monthlyRate: number,
  months: number,
): number {
  if (monthlyRate === 0) return round2(principal / months);
  const factor = Math.pow(1 + monthlyRate, -months);
  return round2((principal * monthlyRate) / (1 - factor));
}