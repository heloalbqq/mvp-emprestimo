import type { BankResult, SimulationResponse } from "../types";
import { formatBRL, formatRate } from "../format";

const STATUS_LABEL: Record<BankResult["status"], string> = {
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
  INDISPONIVEL: "Indisponível",
};

function BankCard({ result, isBest }: { result: BankResult; isBest: boolean }) {
  return (
    <article className={`card ${result.status.toLowerCase()}`}>
      <header>
        <h3>{result.banco}</h3>
        <span className="badge">{STATUS_LABEL[result.status]}</span>
      </header>

      {isBest && <p className="best-tag">Melhor oferta</p>}

      {result.status === "APROVADO" ? (
        <dl>
          <div>
            <dt>Parcela</dt>
            <dd>{formatBRL(result.valorParcela ?? 0)}</dd>
          </div>
          <div>
            <dt>Taxa</dt>
            <dd>{formatRate(result.taxaMensal ?? 0)}</dd>
          </div>
          <div>
            <dt>Total a pagar</dt>
            <dd>{formatBRL(result.valorTotal ?? 0)}</dd>
          </div>
        </dl>
      ) : (
        <p className="muted">{result.motivo}</p>
      )}
    </article>
  );
}

interface Props {
  data: SimulationResponse;
  onReset: () => void;
}

export function Results({ data, onReset }: Props) {
  const { resumo, melhorOferta } = data;

  return (
    <section>
      <h2>Resultado da simulação</h2>
      <p className="muted">
        {data.solicitante.nome} · CPF {data.solicitante.cpf} ·{" "}
        {formatBRL(data.valorSolicitado)} em {data.prazoMeses} meses
      </p>
      <p>
        {resumo.aprovados} aprovado(s), {resumo.reprovados} reprovado(s),{" "}
        {resumo.indisponiveis} indisponível(is)
      </p>

      {melhorOferta ? (
        <div className="notice good">
          Melhor oferta: <strong>{melhorOferta.banco}</strong>, com parcela de{" "}
          {formatBRL(melhorOferta.valorParcela ?? 0)}.
        </div>
      ) : (
        <div className="notice bad">Nenhum banco aprovou esta simulação.</div>
      )}

      <div className="cards">
        {data.resultados.map((result) => (
          <BankCard
            key={result.banco}
            result={result}
            isBest={result.banco === melhorOferta?.banco}
          />
        ))}
      </div>

      {resumo.indisponiveis > 0 && (
        <div className="notice">
          Alguns bancos não responderam a tempo. Faça uma nova simulação para
          consultá-los novamente.
        </div>
      )}

      <button onClick={onReset}>Nova simulação</button>
    </section>
  );
}