import type { FormEvent } from "react";
import { relationshipOptions, roleOptions } from "../constants";
import type {
  CodeStatus,
  FormErrors,
  Gender,
  ImageChangeHandler,
  SignupForm,
  SignupStep,
  UpdateSignupField
} from "../types";
import { Field, FormActions } from "./FormControls";

type StepIndicatorProps = {
  currentStep: number;
  signupStep: SignupStep;
  totalSteps: number;
};

export function StepIndicator({
  currentStep,
  signupStep,
  totalSteps
}: StepIndicatorProps) {
  const labelByStep: Record<SignupStep, string> = {
    phone: "Phone verification",
    credentials: "Account details",
    role: "Choose role",
    child: "Child info",
    relationship: "Relationship"
  };

  return (
    <div className="step-indicator" aria-label="Signup progress">
      <span>
        Step {currentStep} of {totalSteps}
      </span>
      <strong>{labelByStep[signupStep]}</strong>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
}

type SharedStepProps = {
  errors: FormErrors;
  form: SignupForm;
  onBack: () => void;
  onUpdate: UpdateSignupField;
};

export function PhoneStep({
  codeStatus,
  errors,
  form,
  onBack,
  onNext,
  onSendCode,
  onUpdate
}: SharedStepProps & {
  codeStatus: CodeStatus;
  onNext: () => void | Promise<void>;
  onSendCode: () => void | Promise<void>;
}) {
  return (
    <form
      className="auth-form"
      onSubmit={(event) => {
        event.preventDefault();
        void onNext();
      }}
    >
      <div>
        <p className="eyebrow">Create account</p>
        <h2>Verify your phone</h2>
        <p className="form-intro">
          Start with your name and phone number. The code keeps every account
          tied to a real guardian or staff member.
        </p>
      </div>

      <Field error={errors.fullName} id="full-name" label="Full name">
        <input
          id="full-name"
          onChange={(event) => onUpdate("fullName", event.target.value)}
          placeholder="Your full name"
          value={form.fullName}
        />
      </Field>

      <Field error={errors.phoneNumber} id="phone-number" label="Phone number">
        <div className="input-with-button">
          <input
            id="phone-number"
            onChange={(event) => onUpdate("phoneNumber", event.target.value)}
            placeholder="+998 90 123 45 67"
            value={form.phoneNumber}
          />
          <button
            className="secondary-button"
            disabled={codeStatus === "sending"}
            type="button"
            onClick={() => void onSendCode()}
          >
            {codeStatus === "sending" ? "Sending..." : "Send code"}
          </button>
        </div>
      </Field>

      <Field
        error={errors.verificationCode}
        helper={
          codeStatus === "verified"
            ? "Phone number verified."
            : "We will send this code through the API. Local development uses 123456."
        }
        id="verification-code"
        label="Verification code"
      >
        <input
          id="verification-code"
          inputMode="numeric"
          onChange={(event) => onUpdate("verificationCode", event.target.value)}
          placeholder="123456"
          value={form.verificationCode}
        />
      </Field>

      <FormActions onBack={onBack} nextLabel="Next" />
    </form>
  );
}

export function CredentialsStep({
  errors,
  form,
  onBack,
  onNext,
  onUpdate
}: SharedStepProps & {
  onNext: () => void | Promise<void>;
}) {
  return (
    <form
      className="auth-form"
      onSubmit={(event) => {
        event.preventDefault();
        void onNext();
      }}
    >
      <div>
        <p className="eyebrow">Account details</p>
        <h2>Choose your login</h2>
        <p className="form-intro">
          Your username and password will be used for future web logins.
        </p>
      </div>

      <Field error={errors.username} id="signup-username" label="Username">
        <input
          id="signup-username"
          onChange={(event) => onUpdate("username", event.target.value)}
          placeholder="your_username"
          value={form.username}
        />
      </Field>

      <Field error={errors.password} id="signup-password" label="Password">
        <input
          id="signup-password"
          onChange={(event) => onUpdate("password", event.target.value)}
          placeholder="At least 8 characters"
          type="password"
          value={form.password}
        />
      </Field>

      <Field
        error={errors.confirmPassword}
        id="confirm-password"
        label="Confirm password"
      >
        <input
          id="confirm-password"
          onChange={(event) => onUpdate("confirmPassword", event.target.value)}
          placeholder="Repeat password"
          type="password"
          value={form.confirmPassword}
        />
      </Field>

      <FormActions onBack={onBack} nextLabel="Next" />
    </form>
  );
}

export function RoleStep({
  errors,
  form,
  isSubmitting,
  onBack,
  onCompleteStaff,
  onNext,
  onUpdate
}: SharedStepProps & {
  isSubmitting: boolean;
  onCompleteStaff: () => Promise<void>;
  onNext: () => void | Promise<void>;
}) {
  const isStaffRole = form.role === "director" || form.role === "teacher";

  return (
    <form
      className="auth-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (isStaffRole) {
          void onCompleteStaff();
        } else {
          void onNext();
        }
      }}
    >
      <div>
        <p className="eyebrow">Role</p>
        <h2>How will you use Kichkintoy?</h2>
        <p className="form-intro">
          Choose the role that matches your account. Parents continue to child
          profile setup.
        </p>
      </div>

      <div className="role-grid" role="radiogroup" aria-label="Select role">
        {roleOptions.map((role) => (
          <button
            aria-checked={form.role === role.value}
            className={form.role === role.value ? "role-card selected" : "role-card"}
            key={role.value}
            role="radio"
            type="button"
            onClick={() => onUpdate("role", role.value)}
          >
            <span>{role.title.slice(0, 1)}</span>
            <strong>{role.title}</strong>
            <small>{role.description}</small>
          </button>
        ))}
      </div>

      {errors.role ? <p className="field-error">{errors.role}</p> : null}
      {errors.form ? <p className="field-error">{errors.form}</p> : null}

      <FormActions
        nextLabel={isStaffRole ? "Complete registration" : "Next"}
        onBack={onBack}
        submitting={isSubmitting}
      />
    </form>
  );
}

export function ChildStep({
  errors,
  form,
  onBack,
  onImageChange,
  onSubmit,
  onUpdate
}: SharedStepProps & {
  onImageChange: ImageChangeHandler;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <div>
        <p className="eyebrow">Child profile</p>
        <h2>Tell us about your child</h2>
        <p className="form-intro">
          This creates the first child profile connected to your parent account.
        </p>
      </div>

      <Field error={errors.childClass} id="child-class" label="Child class">
        <input
          id="child-class"
          onChange={(event) => onUpdate("childClass", event.target.value)}
          placeholder="Sunflower class"
          value={form.childClass}
        />
      </Field>

      <Field
        error={errors.childImageName}
        helper="Optional. Upload a clear child profile photo."
        id="child-image"
        label="Child image"
      >
        <div className="image-upload">
          <div className="image-preview">
            {form.childImagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="Child preview" src={form.childImagePreview} />
            ) : (
              <span>No image</span>
            )}
          </div>
          <input
            accept="image/*"
            id="child-image"
            onChange={onImageChange}
            type="file"
          />
        </div>
      </Field>

      <Field error={errors.childName} id="child-name" label="Child name">
        <input
          id="child-name"
          onChange={(event) => onUpdate("childName", event.target.value)}
          placeholder="Child name"
          value={form.childName}
        />
      </Field>

      <Field
        error={errors.childDateOfBirth}
        id="child-dob"
        label="Date of birth"
      >
        <input
          id="child-dob"
          onChange={(event) => onUpdate("childDateOfBirth", event.target.value)}
          type="date"
          value={form.childDateOfBirth}
        />
      </Field>

      <Field error={errors.childGender} id="child-gender" label="Gender">
        <select
          id="child-gender"
          onChange={(event) =>
            onUpdate("childGender", event.target.value as Gender | "")
          }
          value={form.childGender}
        >
          <option value="">Select gender</option>
          <option value="boy">Boy</option>
          <option value="girl">Girl</option>
          <option value="prefer_not_to_say">Prefer not to say</option>
        </select>
      </Field>

      <FormActions nextLabel="Register" onBack={onBack} />
    </form>
  );
}

export function RelationshipStep({
  errors,
  form,
  isSubmitting,
  onBack,
  onSubmit,
  onUpdate
}: SharedStepProps & {
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <div>
        <p className="eyebrow">Relationship</p>
        <h2>Who are you to {form.childName || "the child"}?</h2>
        <p className="form-intro">
          This helps teachers understand the family contact connected to the
          child profile.
        </p>
      </div>

      <div className="relationship-grid" role="radiogroup">
        {relationshipOptions.map((relationship) => (
          <button
            aria-checked={form.relationshipType === relationship.value}
            className={
              form.relationshipType === relationship.value
                ? "chip selected"
                : "chip"
            }
            key={relationship.value}
            role="radio"
            type="button"
            onClick={() => onUpdate("relationshipType", relationship.value)}
          >
            {relationship.label}
          </button>
        ))}
      </div>

      {errors.relationshipType ? (
        <p className="field-error">{errors.relationshipType}</p>
      ) : null}

      {form.relationshipType === "other" ? (
        <Field
          id="custom-relationship"
          label="Custom relationship label"
        >
          <input
            id="custom-relationship"
            onChange={(event) =>
              onUpdate("customRelationshipLabel", event.target.value)
            }
            placeholder="Example: Cousin"
            value={form.customRelationshipLabel}
          />
        </Field>
      ) : null}

      {errors.form ? <p className="field-error">{errors.form}</p> : null}

      <FormActions
        nextLabel="Complete registration"
        onBack={onBack}
        submitting={isSubmitting}
      />
    </form>
  );
}
