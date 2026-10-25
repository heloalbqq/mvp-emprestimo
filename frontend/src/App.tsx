import { useState } from "react";
import "./App.css";
import { createSimulation, ValidationError } from "./api";
import { LoadingOverlay } from "./components/LoadingOverlay";
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
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="logo">◆</span>
            <span>Simulador de Consignado</span>
          </div>
          <h1 className="hero-title">Compare bancos e escolha a melhor oferta</h1>
          <p className="hero-sub">Uma simulação, vários bancos, respostas em segundos.</p>
        </div>
      </header>

      <main>
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

      <footer className="footer">
        Protótipo com bancos e dados fictícios. Nenhuma informação é enviada a
        instituições reais.
      </footer>

      {loading && <LoadingOverlay />}
    </>
  );
}