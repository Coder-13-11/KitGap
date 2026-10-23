// Labelled form fields with hint and error text wired to aria-describedby,
// following the GOV.UK and W3C forms patterns: visible labels (never only a
// placeholder), the error next to the field, and the entry kept on error.

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

interface ShellProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  labelClassName?: string;
  children: (describedBy: string | undefined) => ReactNode;
}

export function FieldShell({ id, label, hint, error, optional, className, labelClassName, children }: ShellProps) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className={cn("font-semibold text-ink", labelClassName)}>
        {label}
        {optional ? <span className="ml-1 font-normal text-muted">(optional)</span> : null}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="-mt-0.5 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-semibold text-danger">
          <span className="sr-only">Error: </span>
          {error}
        </p>
      ) : null}
      {children(describedBy)}
    </div>
  );
}

export const inputClass = (error?: string, extra?: string) =>
  cn(
    "w-full rounded-md border bg-surface px-3 py-2.5 text-base text-ink",
    "min-h-11 placeholder:text-[#7b827d]",
    error ? "border-danger border-2" : "border-line-strong",
    "disabled:bg-sunken disabled:text-muted",
    extra,
  );

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  inputClassName?: string;
};

export function TextField({ id, label, hint, error, optional, className, inputClassName, ...input }: TextFieldProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      {(describedBy) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={inputClass(error, inputClassName)}
          {...input}
        />
      )}
    </FieldShell>
  );
}

type TextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
};

export function TextArea({ id, label, hint, error, optional, className, rows = 4, ...input }: TextAreaProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      {(describedBy) => (
        <textarea
          id={id}
          rows={rows}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={inputClass(error, "leading-relaxed")}
          {...input}
        />
      )}
    </FieldShell>
  );
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  options: { value: string; label: string }[];
};

export function SelectField({ id, label, hint, error, optional, className, options, ...select }: SelectProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      {(describedBy) => (
        <select
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={inputClass(error, "pr-8")}
          {...select}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}

export function Fieldset({
  legend,
  hint,
  error,
  id,
  children,
  className,
}: {
  legend: ReactNode;
  hint?: ReactNode;
  error?: string;
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  const hintId = id && hint ? `${id}-hint` : undefined;
  const errorId = id && error ? `${id}-error` : undefined;
  return (
    <fieldset
      id={id}
      className={cn("flex flex-col gap-3", className)}
      aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
    >
      <legend className="mb-1 font-semibold text-ink">{legend}</legend>
      {hint ? (
        <p id={hintId} className="-mt-2 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm font-semibold text-danger">
          <span className="sr-only">Error: </span>
          {error}
        </p>
      ) : null}
      {children}
    </fieldset>
  );
}
