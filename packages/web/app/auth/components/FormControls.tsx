import type { ReactNode } from "react";

type FieldProps = {
  children: ReactNode;
  error?: string;
  helper?: string;
  id: string;
  label: string;
};

export function Field({ children, error, helper, id, label }: FieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {helper ? <p className="field-helper">{helper}</p> : null}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

type FormActionsProps = {
  nextLabel: string;
  onBack: () => void;
  submitting?: boolean;
};

export function FormActions({
  nextLabel,
  onBack,
  submitting = false
}: FormActionsProps) {
  return (
    <div className="form-actions">
      <button
        className="secondary-button"
        disabled={submitting}
        type="button"
        onClick={onBack}
      >
        Back
      </button>
      <button className="primary-button" disabled={submitting} type="submit">
        {submitting ? "Submitting..." : nextLabel}
      </button>
    </div>
  );
}
