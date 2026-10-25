import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { SimulationPayload } from "../types";
import { maskCnpj, maskCpf } from "../format";

interface Props {
  loading: boolean;
  fieldErrors: Record<string, string>;
  onSubmit: (payload: SimulationPayload) => void;
}

const initialState = {
  nome: "",
  email: "",
  cpf: "",
  cnpjEmpregador: "",
  salario: "",
  valorSolicitado: "",
  prazoMeses: "24",
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
  const [form, setForm] = useState(initialState);

  function set(field: keyof typeof initialState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const toNumber = (value: string) => (value.trim() === "" ? null : Number(value));

    onSubmit({
      nome: form.nome,
      email: form.email,
      cpf: form.cpf,
      cnpjEmpregador: form.cnpjEmpregador,
      salario: toNumber(form.salario),
      valorSolicitado: toNumber(form.valorSolicitado),
      prazoMeses: toNumber(form.prazoMeses),
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2>Simule seu empréstimo consignado</h2>

      <Field label="Nome completo" error={fieldErrors.nome}>
        <input
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

      <div className="row">
        <Field label="CPF" error={fieldErrors.cpf}>
          <input
            value={form.cpf}
            onChange={(e) => set("cpf", maskCpf(e.target.value))}
            placeholder="000.000.000-00"
            inputMode="numeric"
          />
        </Field>
        <Field label="CNPJ do empregador" error={fieldErrors.cnpjEmpregador}>
          <input
            value={form.cnpjEmpregador}
            onChange={(e) => set("cnpjEmpregador", maskCnpj(e.target.value))}
            placeholder="00.000.000/0000-00"
            inputMode="numeric"
          />
        </Field>
      </div>

      <div className="row">
        <Field label="Salário mensal (R$)" error={fieldErrors.salario}>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.salario}
            onChange={(e) => set("salario", e.target.value)}
          />
        </Field>
        <Field label="Valor desejado (R$)" error={fieldErrors.valorSolicitado}>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.valorSolicitado}
            onChange={(e) => set("valorSolicitado", e.target.value)}
          />
        </Field>
        <Field label="Prazo (meses)" error={fieldErrors.prazoMeses}>
          <input
            type="number"
            min="6"
            max="96"
            value={form.prazoMeses}
            onChange={(e) => set("prazoMeses", e.target.value)}
          />
        </Field>
      </div>

      <button type="submit" disabled={loading}>
        {loading ? "Consultando bancos..." : "Simular"}
      </button>
    </form>
  );
}