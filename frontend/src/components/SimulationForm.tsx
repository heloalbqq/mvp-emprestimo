import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { SimulationPayload } from "../types";
import { formatBRL, maskCnpj, maskCpf } from "../format";

interface Props {
  loading: boolean;
  fieldErrors: Record<string, string>;
  onSubmit: (payload: SimulationPayload) => void;
}

const STEPS = ["Seus dados", "Trabalho", "Empréstimo"];
const TERMS = [12, 24, 36, 48, 60, 72, 84, 96];

// Em qual etapa mora cada campo (para voltar à etapa certa quando o servidor reclamar)
const STEP_OF_FIELD: Record<string, number> = {
  nome: 0,
  email: 0,
  cpf: 0,
  cnpjEmpregador: 1,
  salario: 1,
  valorSolicitado: 2,
  prazoMeses: 2,
  consentimento: 2,
};

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error && <small className="error">{error}</small>}
    </label>
  );
}

export function SimulationForm({ loading, fieldErrors, onSubmit }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    cpf: "",
    cnpjEmpregador: "",
    salario: "",
  });
  const [valor, setValor] = useState(10000);
  const [prazo, setPrazo] = useState(24);
  const [consentimento, setConsentimento] = useState(false);

  // Quando o servidor devolve erros, volta para a primeira etapa que tem erro.
  const [seenErrors, setSeenErrors] = useState(fieldErrors);
  if (fieldErrors !== seenErrors) {
    setSeenErrors(fieldErrors);
    const steps = Object.keys(fieldErrors).map((key) => STEP_OF_FIELD[key] ?? 2);
    if (steps.length > 0) setStep(Math.min(...steps));
  }

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const isLastStep = step === STEPS.length - 1;

  const canContinue =
    step === 0
      ? form.nome.trim() !== "" && form.email.trim() !== "" && form.cpf.trim() !== ""
      : step === 1
        ? form.cnpjEmpregador.trim() !== "" && form.salario.trim() !== ""
        : true;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!isLastStep) {
      if (canContinue) setStep(step + 1);
      return;
    }

    onSubmit({
      nome: form.nome,
      email: form.email,
      cpf: form.cpf,
      cnpjEmpregador: form.cnpjEmpregador,
      salario: form.salario.trim() === "" ? null : Number(form.salario),
      valorSolicitado: valor,
      prazoMeses: prazo,
      consentimento,
    });
  }

  return (
    <form className="panel" onSubmit={handleSubmit} noValidate>
      <ol className="stepper">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={index === step ? "active" : index < step ? "done" : ""}
          >
            <span className="dot">{index < step ? "✓" : index + 1}</span>
            <span className="label">{label}</span>
          </li>
        ))}
      </ol>
      <div className="progress">
        <div className="bar" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      {step === 0 && (
        <div className="step-body">
          <h2>Vamos começar</h2>
          <p className="muted">Precisamos de alguns dados para consultar os bancos.</p>

          <Field label="Nome completo" error={fieldErrors.nome}>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              autoComplete="name"
            />
          </Field>

          <Field label="E-mail" error={fieldErrors.email}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              autoComplete="email"
            />
          </Field>

          <Field label="CPF" error={fieldErrors.cpf}>
            <input
              type="text"
              value={form.cpf}
              onChange={(e) => set("cpf", maskCpf(e.target.value))}
              placeholder="000.000.000-00"
              inputMode="numeric"
            />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="step-body">
          <h2>Onde você trabalha</h2>
          <p className="muted">O consignado é descontado direto da folha de pagamento.</p>

          <Field label="CNPJ do empregador" error={fieldErrors.cnpjEmpregador}>
            <input
              type="text"
              value={form.cnpjEmpregador}
              onChange={(e) => set("cnpjEmpregador", maskCnpj(e.target.value))}
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
            />
          </Field>

          <Field label="Salário mensal" error={fieldErrors.salario}>
            <div className="money">
              <span>R$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.salario}
                onChange={(e) => set("salario", e.target.value)}
                inputMode="decimal"
              />
            </div>
          </Field>
        </div>
      )}

      {step === 2 && (
        <div className="step-body">
          <h2>Quanto você precisa?</h2>
          <p className="muted">Arraste para escolher o valor e o prazo.</p>

          <span className="slider-label">Valor desejado</span>
          <p className="big-value">{formatBRL(valor)}</p>
          <input
            type="range"
            min={500}
            max={100000}
            step={500}
            value={valor}
            onChange={(e) => setValor(Number(e.target.value))}
            aria-label="Valor desejado"
          />
          <div className="range-scale">
            <span>R$ 500</span>
            <span>R$ 100 mil</span>
          </div>
          {fieldErrors.valorSolicitado && (
            <small className="error">{fieldErrors.valorSolicitado}</small>
          )}

          <p className="terms-title">Em quantos meses?</p>
          <div className="terms">
            {TERMS.map((months) => (
              <button
                key={months}
                type="button"
                className="term"
                aria-pressed={prazo === months}
                onClick={() => setPrazo(months)}
              >
                {months}
                <small>meses</small>
              </button>
            ))}
          </div>
          {fieldErrors.prazoMeses && (
            <small className="error">{fieldErrors.prazoMeses}</small>
          )}

          <label className="consent">
            <input
              type="checkbox"
              checked={consentimento}
              onChange={(e) => setConsentimento(e.target.checked)}
            />
            <span>
              Autorizo a consulta ao meu histórico de crédito para avaliar esta simulação.
            </span>
          </label>
          {fieldErrors.consentimento && (
            <small className="error">{fieldErrors.consentimento}</small>
          )}
        </div>
      )}

      <div className="actions">
        {step > 0 && (
          <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}>
            Voltar
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={!canContinue || loading}>
          {isLastStep ? "Simular agora" : "Continuar"}
        </button>
      </div>
    </form>
  );
}