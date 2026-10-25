import type { FastifyPluginAsync } from "fastify";
import type { SimulationService } from "../services/simulation.service";
import { simulationSchema } from "../validators/simulation.schema";

export function simulationsRoutes(service: SimulationService): FastifyPluginAsync {
  return async (app) => {
    app.post("/simulations", async (request, reply) => {
      const parsed = simulationSchema.safeParse(request.body);

      if (!parsed.success) {
        const campos: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const campo = issue.path.join(".") || "body";
          campos[campo] ??= issue.message;
        }
        return reply.status(400).send({ erro: "Dados inválidos", campos });
      }

      const response = await service.simulate(parsed.data);

      request.log.info(
        { simulationId: response.id, cpf: response.solicitante.cpf, resumo: response.resumo },
        "simulação concluída",
      );

      return reply.status(201).send(response);
    });
  };
}