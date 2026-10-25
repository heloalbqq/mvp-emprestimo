import Fastify from "fastify";
import cors from "@fastify/cors";
import { createDefaultProviders } from "./providers";
import { simulationsRoutes } from "./routes/simulation.route";
import { FakeCreditBureau } from "./services/credit-biro";
import { SimulationService } from "./services/simulation.service";

export function buildApp(
  service: SimulationService = new SimulationService(
    createDefaultProviders(),
    {},
    new FakeCreditBureau(),
  ),
  options: { logger?: boolean } = {},
) {
  const app = Fastify({ logger: options.logger ?? true });
  app.register(cors);

  app.get("/health", async () => ({ status: "ok" }));
  app.register(simulationsRoutes(service));

  app.setErrorHandler((error, request, reply) => {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;

    if (statusCode >= 500) {
      request.log.error(error);
      return reply.status(500).send({ erro: "Erro interno. Tente novamente em instantes." });
    }
    return reply.status(statusCode).send({ erro: "Requisição inválida" });
  });

  return app;
}