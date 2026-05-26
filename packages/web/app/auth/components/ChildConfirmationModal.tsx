import type { SignupForm } from "../types";

type ChildConfirmationModalProps = {
  form: SignupForm;
  onConfirm: () => void;
  onEdit: () => void;
};

export function ChildConfirmationModal({
  form,
  onConfirm,
  onEdit
}: ChildConfirmationModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        aria-labelledby="child-confirmation-title"
        aria-modal="true"
        className="modal-card"
        role="dialog"
      >
        <div>
          <p className="eyebrow">Confirm child info</p>
          <h2 id="child-confirmation-title">Review before continuing</h2>
          <p className="form-intro">
            Make sure the child information is correct before selecting your
            relationship type.
          </p>
        </div>

        <div className="child-summary">
          <div className="image-preview large">
            {form.childImagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="Child preview" src={form.childImagePreview} />
            ) : (
              <span>No image</span>
            )}
          </div>
          <dl>
            <div>
              <dt>Name</dt>
              <dd>{form.childName}</dd>
            </div>
            <div>
              <dt>Date of birth</dt>
              <dd>{form.childDateOfBirth}</dd>
            </div>
            <div>
              <dt>Gender</dt>
              <dd>{form.childGender.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt>Class</dt>
              <dd>{form.childClass}</dd>
            </div>
          </dl>
        </div>

        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={onEdit}>
            Edit
          </button>
          <button className="primary-button" type="button" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </section>
    </div>
  );
}
