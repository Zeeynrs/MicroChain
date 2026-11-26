"use client";

import { useId, useState } from "react";
import { Input } from "./input";

interface NumberInputProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  /** Dipanggil hanya dengan bilangan bulat valid dalam rentang. */
  onCommit: (value: number) => void;
  hint?: string;
  hideLabel?: boolean;
}

/**
 * Isian bilangan bulat yang aman diketik: nilai tidak valid (kosong, huruf, minus, di luar rentang)
 * tidak pernah diteruskan ke state. Pesan galat tampil dan nilai sah terakhir dipulihkan saat blur.
 * Tampilannya memakai gaya `.field` dan `.input` dari desain Pasok-Siaga.
 */
export function NumberInput({ label, value, min = 0, max = 1_000_000, onCommit, hint, hideLabel }: NumberInputProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? String(value);

  let error: string | null = null;
  if (draft !== null) {
    if (!/^\d+$/.test(draft.trim())) error = "Isi dengan angka bulat, tanpa huruf atau tanda minus.";
    else if (Number(draft) < min || Number(draft) > max) error = `Isi angka antara ${min} dan ${max.toLocaleString("id-ID")}.`;
  }

  return (
    <div className="field">
      <label htmlFor={id} className={hideLabel ? "sr-only" : undefined}>{label}</label>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={text}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          if (/^\d+$/.test(next.trim())) {
            const n = Number(next);
            if (n >= min && n <= max) onCommit(n);
          }
        }}
        onBlur={() => setDraft(null)}
      />
      {hint && !error && <small className="field-hint">{hint}</small>}
      {error && <small id={`${id}-error`} role="alert" className="field-error">{error}</small>}
    </div>
  );
}

interface TextInputProps {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  maxLength?: number;
  hideLabel?: boolean;
}

/** Isian teks wajib-isi: nilai kosong tidak diteruskan dan dipulihkan saat blur. */
export function TextInput({ label, value, onCommit, maxLength = 100, hideLabel }: TextInputProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const error = draft !== null && draft.trim() === "" ? "Nama wajib diisi." : null;
  return (
    <div className="field">
      <label htmlFor={id} className={hideLabel ? "sr-only" : undefined}>{label}</label>
      <Input
        id={id}
        value={draft ?? value}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => {
          setDraft(event.target.value);
          if (event.target.value.trim() !== "") onCommit(event.target.value);
        }}
        onBlur={() => setDraft(null)}
      />
      {error && <small id={`${id}-error`} role="alert" className="field-error">{error}</small>}
    </div>
  );
}

interface DateInputProps {
  label: string;
  value: string;
  onCommit: (value: string) => void;
}

/** Isian tanggal; hanya tanggal ISO valid yang diteruskan. */
export function DateInput({ label, value, onCommit }: DateInputProps) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          if (/^\d{4}-\d{2}-\d{2}$/.test(next) && !Number.isNaN(new Date(`${next}T00:00:00Z`).getTime())) onCommit(next);
        }}
      />
    </div>
  );
}
