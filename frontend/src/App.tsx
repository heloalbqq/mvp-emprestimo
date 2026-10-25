import { useState } from "react";
import "./App.css";
import { createSimulation, ValidationError } from "./api";
import { Results } from "./components/Results";
import { SimulationForm } from "./components/SimulationForm";
import type { SimulationPayload, SimulationResponse } from "./types";

export default function App() {
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(payload: SimulationPayload) {
    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      setResult(await createSimulation(payload));
    } catch (err) {
      if (err instanceof ValidationError) {
        setFieldErrors(err.campos);
      } else {
        setError(err instanceof Error ? err.message : "Erro inesperado.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>Simulador de Consignado</h1>
      <p className="muted">Protótipo com bancos e dados fictícios.</p>

      {error && <div className="notice bad">{error}</div>}

      {result ? (
        <Results data={result} onReset={() => setResult(null)} />
      ) : (
        <SimulationForm
          loading={loading}
          fieldErrors={fieldErrors}
          onSubmit={handleSubmit}
        />
      )}
    </main>
  );
}