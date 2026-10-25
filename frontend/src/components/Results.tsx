import type { BankResult, SimulationResponse } from "../types";
import { formatBRL, formatRate } from "../format";

const STATUS_LABEL: Record<BankResult["status"], string> = {
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
  INDISPONIVEL: "Indisponível",
};

const initialOf = (bank: string) => bank.replace("Banco ", "").charAt(0);

function BestOffer({
  offer,
  months,
  saving,
}: {
  offer: BankResult;
  months: number;
  saving: number;
}) {
  return (
    <div className="best">
      <div className="best-top">
        <span className="best-tag">★ Melhor oferta</span>
        <span className="best-bank">
          <span className="avatar">{initialOf(offer.banco)}</span>
          {offer.banco}
        </span>
      </div>

      <p className="best-installment">
        {formatBRL(offer.valorParcela ?? 0)}
        <small> por mês · {months}x</small>
      </p>

      <dl className="best-stats">
        <div>
          <dt>Taxa</dt>
          <dd>{formatRate(offer.taxaMensal ?? 0)}</dd>
        </div>
        <div>
          <dt>Total a pagar</dt>
          <dd>{formatBRL(offer.valorTotal ?? 0)}</dd>
        </div>
      </dl>

      {saving > 0 && (
        <p className="saving">
          Você economiza {formatBRL(saving)} em relação à oferta aprovada mais cara.
        </p>
      )}
    </div>
  );
}

function BankRow({
  result,
  index,
}: {
  result: BankResult;
  index: number;
}) {
  return (
    <article
      className={`row-card ${result.status.toLowerCase()}`}
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <span className="avatar">{initialOf(result.banco)}</span>
      <div className="row-main">
        <h4>{result.banco}</h4>
        {result.status === "APROVADO" ? (
          <p className="muted">
            {formatBRL(result.valorParcela ?? 0)} por mês · {formatRate(result.taxaMensal ?? 0)} ·
            total {formatBRL(result.valorTotal ?? 0)}
          </p>
        ) : (
          <p className="muted">{result.motivo}</p>
        )}
      </div>
      <span className="badge">{STATUS_LABEL[result.status]}</span>
    </article>
  );
}

interface Props {
  data: SimulationResponse;
  onReset: () => void;
}

export function Results({ data, onReset }: Props) {
  const { resumo, melhorOferta } = data;

  const approved = data.resultados.filter((r) => r.status === "APROVADO");
  const saving =
    melhorOferta && approved.length > 1
      ? Math.max(...approved.map((r) => r.valorTotal ?? 0)) - (melhorOferta.valorTotal ?? 0)
      : 0;

  const others = data.resultados.filter((r) => r.banco !== melhorOferta?.banco);

  return (
    <section className="panel">
      <h2>Resultado da simulação</h2>
      <p className="muted">
        {data.solicitante.nome} · CPF {data.solicitante.cpf} · {formatBRL(data.valorSolicitado)} em{" "}
        {data.prazoMeses} meses
      </p>

      <div className="pills">
        <span className="pill good">{resumo.aprovados} aprovado(s)</span>
        <span className="pill bad">{resumo.reprovados} reprovado(s)</span>
        <span className="pill warn">{resumo.indisponiveis} indisponível(is)</span>
      </div>

      {melhorOferta ? (
        <BestOffer offer={melhorOferta} months={data.prazoMeses} saving={saving} />
      ) : (
        <div className="notice bad">Nenhum banco aprovou esta simulação.</div>
      )}

      {others.length > 0 && (
        <>
          <p className="section-title">
            {melhorOferta ? "Outras respostas" : "Respostas dos bancos"}
          </p>
          {others.map((result, index) => (
            <BankRow key={result.banco} result={result} index={index} />
          ))}
        </>
      )}

      {resumo.indisponiveis > 0 && (
        <div className="notice">
          Alguns bancos não responderam a tempo. Faça uma nova simulação para consultá-los
          novamente.
        </div>
      )}

      <div className="actions">
        <button className="btn btn-ghost" onClick={onReset}>
          Nova simulação
        </button>
      </div>
    </section>
  );
}