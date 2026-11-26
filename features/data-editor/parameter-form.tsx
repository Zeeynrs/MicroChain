"use client";

import { useId, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useForm, type FieldError } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { formatMoney, formatQuantity } from "@/lib/format";
import type { WorkspaceSnapshot as Snapshot } from "@/lib/domain/types";
import { applyParameters, currentParameters, PARAMETER_MAX, parametersSchema, type Parameters } from "./parameters";

interface FormProps {
  snapshot: Snapshot;
  pending?: boolean;
  onApply: (next: Snapshot) => void;
  children: (props: { dirty: boolean }) => ReactNode;
  compact?: boolean;
}

export function ParameterForm({ snapshot, pending, onApply, children, compact }: FormProps) {
  const formId = useId();
  const form = useForm<Parameters>({ resolver: zodResolver(parametersSchema), values: currentParameters(snapshot) });
  const { isDirty, errors } = form.formState;

  function field(name: `${keyof Parameters}.${number}`, label: string, error?: FieldError) {
    const id = `${formId}-${name}`;
    return (
      <div className="field" key={name}>
        <label htmlFor={id}>{label}</label>
        <Input id={id} type="number" inputMode="numeric" min={0} max={PARAMETER_MAX} step={1}
          aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
          {...form.register(name, { valueAsNumber: true })} />
        {error && <small id={`${id}-error`} className="field-error">{error.message}</small>}
      </div>
    );
  }

  const inputs = (
    <fieldset disabled={pending} className={compact ? "parameters-compact" : "parameters-full"}>
        <legend className="sr-only">Parameter produksi</legend>
        <section className="parameter-section">
          <h3>Stok bahan baku</h3>
          <div className="parameter-fields">
            {snapshot.materials.map((item, index) => field(`materials.${index}`, `Stok ${item.name.toLocaleLowerCase("id-ID")} (${item.base_unit})`, errors.materials?.[index]))}
          </div>
        </section>
        <section className="parameter-section">
          <h3>Permintaan produk</h3>
          <div className="parameter-fields">
            {snapshot.products.map((item, index) => field(`products.${index}`, `Permintaan ${item.name.toLocaleLowerCase("id-ID")} (unit)`, errors.products?.[index]))}
          </div>
        </section>
        {snapshot.alternative_offers.length > 0 && (
          <section className="parameter-section">
            <h3>Pemasok alternatif</h3>
            <div className="parameter-fields">
              {snapshot.alternative_offers.map((item, index) => {
                const supplier = snapshot.suppliers.find(({ id }) => id === item.supplier_id);
                const material = snapshot.materials.find(({ id }) => id === item.material_id);
                const label = `Batas pak ${supplier?.name ?? item.supplier_id}`;
                return <div key={item.id}>{field(`offers.${index}`, label, errors.offers?.[index])}{material && <small className="field-hint">{material.name} · {formatQuantity(item.pack_size_base_units, material.base_unit)} per pak · tambahan {formatMoney(item.incremental_premium_idr_per_pack)}</small>}</div>;
              })}
            </div>
          </section>
        )}
    </fieldset>
  );

  return (
    <form noValidate onSubmit={form.handleSubmit((values) => onApply(applyParameters(snapshot, values)))}>
      {compact ? (
        <details className="parameter-details">
          <summary><SlidersHorizontal size={17} aria-hidden="true" /> Ubah parameter <ChevronDown size={17} aria-hidden="true" /></summary>
          {inputs}
        </details>
      ) : inputs}
      {children({ dirty: isDirty })}
    </form>
  );
}
