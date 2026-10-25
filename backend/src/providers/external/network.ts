export interface NetworkOptions {
  minLatencyMs: number;
  maxLatencyMs: number;
  failureRate: number; 
}

export const DEFAULT_NETWORK: NetworkOptions = {
  minLatencyMs: 150,
  maxLatencyMs: 900,
  failureRate: 0.1,
};

export const NO_NETWORK: NetworkOptions = {
  minLatencyMs: 0,
  maxLatencyMs: 0,
  failureRate: 0,
};

export async function simulateNetwork(options: NetworkOptions): Promise<void> {
  const { minLatencyMs, maxLatencyMs, failureRate } = options;
  const latency = minLatencyMs + Math.random() * (maxLatencyMs - minLatencyMs);
  await new Promise((resolve) => setTimeout(resolve, latency));
  if (Math.random() < failureRate) {
    throw new Error("Falha de comunicação com o banco");
  }
}