export class BankIntegrationError extends Error {
  constructor(
    public readonly banco: string,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "BankIntegrationError";
  }
}