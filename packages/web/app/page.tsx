"use client";

import { appConfig } from "@kichkintoy/shared";
import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";

type AuthMode = "login" | "signup";
type SignupStep = "phone" | "credentials" | "role" | "child" | "relationship";
type UserRole = "director" | "parent" | "teacher";
type Gender = "boy" | "girl" | "prefer_not_to_say";
type RelationshipType =
  | "mom"
  | "dad"
  | "grandmother"
  | "grandfather"
  | "uncle"
  | "aunt"
  | "brother"
  | "sister"
  | "guardian"
  | "other";

type SignupForm = {
  fullName: string;
  phoneNumber: string;
  verificationCode: string;
  username: string;
  password: string;
  confirmPassword: string;
  role: UserRole | "";
  childClass: string;
  childImageName: string;
  childImagePreview: string;
  childName: string;
  childDateOfBirth: string;
  childGender: Gender | "";
  relationshipType: RelationshipType | "";
  customRelationshipLabel: string;
};

const verificationDemoCode = "123456";

const roleOptions: Array<{
  value: UserRole;
  title: string;
  description: string;
}> = [
  {
    value: "director",
    title: "Director",
    description: "Manage your kindergarten, classes, teachers, and messages."
  },
  {
    value: "parent",
    title: "Parent",
    description: "Follow your child's day and communicate with the center."
  },
  {
    value: "teacher",
    title: "Teacher",
    description: "Share reports, photos, notices, and attendance with families."
  }
];

const relationshipOptions: Array<{
  value: RelationshipType;
  label: string;
}> = [
  { value: "mom", label: "Mom" },
  { value: "dad", label: "Dad" },
  { value: "grandmother", label: "Grandmother" },
  { value: "grandfather", label: "Grandfather" },
  { value: "uncle", label: "Uncle" },
  { value: "aunt", label: "Aunt" },
  { value: "brother", label: "Brother" },
  { value: "sister", label: "Sister" },
  { value: "guardian", label: "Guardian" },
  { value: "other", label: "Other" }
];

const initialSignupForm: SignupForm = {
  fullName: "",
  phoneNumber: "",
  verificationCode: "",
  username: "",
  password: "",
  confirmPassword: "",
  role: "",
  childClass: "",
  childImageName: "",
  childImagePreview: "",
  childName: "",
  childDateOfBirth: "",
  childGender: "",
  relationshipType: "",
  customRelationshipLabel: ""
};

function isValidPhoneNumber(phoneNumber: string) {
  return /^\+?[0-9\s()-]{9,18}$/.test(phoneNumber.trim());
}

function hasValidPassword(password: string) {
  return /[A-Za-z]/.test(password) && /\d/.test(password) && password.length >= 8;
}

export default function HomePage() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [signupStep, setSignupStep] = useState<SignupStep>("phone");
  const [signupForm, setSignupForm] = useState<SignupForm>(initialSignupForm);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [codeStatus, setCodeStatus] = useState<
    "idle" | "sending" | "sent" | "verified"
  >("idle");
  const [showChildModal, setShowChildModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const currentStepNumber = useMemo(() => {
    const steps: SignupStep[] =
      signupForm.role === "parent"
        ? ["phone", "credentials", "role", "child", "relationship"]
        : ["phone", "credentials", "role"];

    return steps.indexOf(signupStep) + 1;
  }, [signupForm.role, signupStep]);

  const totalSteps = signupForm.role === "parent" ? 5 : 3;

  function updateSignupField<K extends keyof SignupForm>(
    field: K,
    value: SignupForm[K]
  ) {
    setSignupForm((current) => ({
      ...current,
      [field]: value
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      delete next.form;
      return next;
    });
    setSuccessMessage("");
  }

  function switchMode(nextMode: AuthMode) {
    setAuthMode(nextMode);
    setErrors({});
    setSuccessMessage("");
  }

  function sendCode() {
    const nextErrors: Record<string, string> = {};

    if (!signupForm.phoneNumber.trim()) {
      nextErrors.phoneNumber = "Phone number is required.";
    } else if (!isValidPhoneNumber(signupForm.phoneNumber)) {
      nextErrors.phoneNumber = "Enter a valid phone number.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setCodeStatus("sending");
    window.setTimeout(() => {
      setCodeStatus("sent");
      setSuccessMessage(`Demo code sent. Use ${verificationDemoCode}.`);
    }, 450);
  }

  function validatePhoneStep() {
    const nextErrors: Record<string, string> = {};

    if (!signupForm.fullName.trim()) {
      nextErrors.fullName = "Full name is required.";
    }

    if (!signupForm.phoneNumber.trim()) {
      nextErrors.phoneNumber = "Phone number is required.";
    } else if (!isValidPhoneNumber(signupForm.phoneNumber)) {
      nextErrors.phoneNumber = "Enter a valid phone number.";
    }

    if (!signupForm.verificationCode.trim()) {
      nextErrors.verificationCode = "Verification code is required.";
    } else if (signupForm.verificationCode !== verificationDemoCode) {
      nextErrors.verificationCode = "Verification code is incorrect.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      setCodeStatus("verified");
      return true;
    }

    return false;
  }

  function validateCredentialsStep() {
    const nextErrors: Record<string, string> = {};
    const unavailableUsernames = new Set(["admin", "demo", "test"]);

    if (!signupForm.username.trim()) {
      nextErrors.username = "Username is required.";
    } else if (signupForm.username.trim().length < 3) {
      nextErrors.username = "Username must be at least 3 characters.";
    } else if (unavailableUsernames.has(signupForm.username.trim().toLowerCase())) {
      nextErrors.username = "This username is already taken.";
    }

    if (!signupForm.password) {
      nextErrors.password = "Password is required.";
    } else if (!hasValidPassword(signupForm.password)) {
      nextErrors.password =
        "Use at least 8 characters with one letter and one number.";
    }

    if (!signupForm.confirmPassword) {
      nextErrors.confirmPassword = "Confirm your password.";
    } else if (signupForm.password !== signupForm.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateRoleStep() {
    if (!signupForm.role) {
      setErrors({ role: "Select your role." });
      return false;
    }

    setErrors({});
    return true;
  }

  function validateChildStep() {
    const nextErrors: Record<string, string> = {};
    const today = new Date().toISOString().slice(0, 10);

    if (!signupForm.childClass.trim()) {
      nextErrors.childClass = "Child class is required.";
    }

    if (!signupForm.childName.trim()) {
      nextErrors.childName = "Child name is required.";
    }

    if (!signupForm.childDateOfBirth) {
      nextErrors.childDateOfBirth = "Date of birth is required.";
    } else if (signupForm.childDateOfBirth > today) {
      nextErrors.childDateOfBirth = "Date of birth cannot be in the future.";
    }

    if (!signupForm.childGender) {
      nextErrors.childGender = "Select child gender.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateRelationshipStep() {
    const nextErrors: Record<string, string> = {};

    if (!signupForm.relationshipType) {
      nextErrors.relationshipType = "Select your relationship to the child.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function goToNextStep() {
    setSuccessMessage("");

    if (signupStep === "phone" && validatePhoneStep()) {
      setSignupStep("credentials");
      return;
    }

    if (signupStep === "credentials" && validateCredentialsStep()) {
      setSignupStep("role");
      return;
    }

    if (signupStep === "role" && validateRoleStep()) {
      if (signupForm.role === "parent") {
        setSignupStep("child");
      } else {
        setSuccessMessage(`${signupForm.role} registration is ready to submit.`);
      }
    }
  }

  function goBack() {
    setErrors({});
    setSuccessMessage("");

    if (signupStep === "credentials") {
      setSignupStep("phone");
    } else if (signupStep === "role") {
      setSignupStep("credentials");
    } else if (signupStep === "child") {
      setSignupStep("role");
    } else if (signupStep === "relationship") {
      setSignupStep("child");
    }
  }

  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!loginUsername.trim()) {
      nextErrors.loginUsername = "Username is required.";
    }

    if (!loginPassword) {
      nextErrors.loginPassword = "Password is required.";
    }

    setErrors(nextErrors);
    setSuccessMessage("");

    if (Object.keys(nextErrors).length === 0) {
      setSuccessMessage("Login form is ready to connect to the auth API.");
    }
  }

  function submitChildInfo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (validateChildStep()) {
      setShowChildModal(true);
    }
  }

  function confirmChildInfo() {
    setShowChildModal(false);
    setSignupStep("relationship");
    setErrors({});
  }

  function completeParentRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (validateRelationshipStep()) {
      setSuccessMessage("Parent registration is ready to submit.");
    }
  }

  function completeStaffRegistration() {
    if (signupForm.role === "director" || signupForm.role === "teacher") {
      setSuccessMessage(`${signupForm.role} registration is ready to submit.`);
    }
  }

  function handleChildImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      updateSignupField("childImageName", "");
      updateSignupField("childImagePreview", "");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrors((current) => ({
        ...current,
        childImageName: "Upload an image file."
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSignupForm((current) => ({
        ...current,
        childImageName: file.name,
        childImagePreview: String(reader.result ?? "")
      }));
      setErrors((current) => {
        const next = { ...current };
        delete next.childImageName;
        return next;
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <main className="auth-shell">
      <section className="auth-hero" aria-labelledby="auth-heading">
        <div className="brand-pill">Kichkintoy Web</div>
        <h1 id="auth-heading">Connect kindergarten and families with care.</h1>
        <p>
          A calm, friendly space for directors, teachers, and parents to share a
          child's day, notices, albums, attendance, and care updates.
        </p>

        <div className="phone-preview" aria-hidden="true">
          <div className="phone-top" />
          <div className="preview-card primary">
            <span>Daily report</span>
            <strong>Ali had a happy morning.</strong>
          </div>
          <div className="preview-grid">
            <div>
              <span>Meals</span>
              <strong>Lunch done</strong>
            </div>
            <div>
              <span>Sleep</span>
              <strong>1h 20m</strong>
            </div>
          </div>
          <div className="preview-card">
            <span>Notice</span>
            <strong>Spring concert on Friday</strong>
          </div>
        </div>
      </section>

      <section className="auth-card" aria-label="Authentication form">
        <div className="auth-tabs" role="tablist" aria-label="Auth mode">
          <button
            className={authMode === "login" ? "active" : ""}
            type="button"
            onClick={() => switchMode("login")}
          >
            Login
          </button>
          <button
            className={authMode === "signup" ? "active" : ""}
            type="button"
            onClick={() => switchMode("signup")}
          >
            Sign up
          </button>
        </div>

        {successMessage ? (
          <div className="notice success" role="status">
            {successMessage}
          </div>
        ) : null}

        {authMode === "login" ? (
          <LoginForm
            errors={errors}
            loginPassword={loginPassword}
            loginUsername={loginUsername}
            onPasswordChange={setLoginPassword}
            onSubmit={submitLogin}
            onUsernameChange={setLoginUsername}
          />
        ) : (
          <>
            <StepIndicator
              currentStep={currentStepNumber}
              signupStep={signupStep}
              totalSteps={totalSteps}
            />

            {signupStep === "phone" ? (
              <PhoneStep
                codeStatus={codeStatus}
                errors={errors}
                form={signupForm}
                onBack={() => switchMode("login")}
                onNext={goToNextStep}
                onSendCode={sendCode}
                onUpdate={updateSignupField}
              />
            ) : null}

            {signupStep === "credentials" ? (
              <CredentialsStep
                errors={errors}
                form={signupForm}
                onBack={goBack}
                onNext={goToNextStep}
                onUpdate={updateSignupField}
              />
            ) : null}

            {signupStep === "role" ? (
              <RoleStep
                errors={errors}
                form={signupForm}
                onBack={goBack}
                onCompleteStaff={completeStaffRegistration}
                onNext={goToNextStep}
                onUpdate={updateSignupField}
              />
            ) : null}

            {signupStep === "child" ? (
              <ChildStep
                errors={errors}
                form={signupForm}
                onBack={goBack}
                onImageChange={handleChildImage}
                onSubmit={submitChildInfo}
                onUpdate={updateSignupField}
              />
            ) : null}

            {signupStep === "relationship" ? (
              <RelationshipStep
                errors={errors}
                form={signupForm}
                onBack={goBack}
                onSubmit={completeParentRegistration}
                onUpdate={updateSignupField}
              />
            ) : null}
          </>
        )}
      </section>

      {showChildModal ? (
        <ChildConfirmationModal
          form={signupForm}
          onConfirm={confirmChildInfo}
          onEdit={() => setShowChildModal(false)}
        />
      ) : null}
    </main>
  );
}

function LoginForm({
  errors,
  loginPassword,
  loginUsername,
  onPasswordChange,
  onSubmit,
  onUsernameChange
}: {
  errors: Record<string, string>;
  loginPassword: string;
  loginUsername: string;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUsernameChange: (value: string) => void;
}) {
  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <div>
        <p className="eyebrow">Welcome back</p>
        <h2>Login to {appConfig.name}</h2>
        <p className="form-intro">
          Use your username and password to continue to your dashboard.
        </p>
      </div>

      <Field
        error={errors.loginUsername}
        id="login-username"
        label="Username"
      >
        <input
          id="login-username"
          name="username"
          onChange={(event) => onUsernameChange(event.target.value)}
          placeholder="your_username"
          value={loginUsername}
        />
      </Field>

      <Field
        error={errors.loginPassword}
        id="login-password"
        label="Password"
      >
        <input
          id="login-password"
          name="password"
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder="Enter password"
          type="password"
          value={loginPassword}
        />
      </Field>

      <button className="primary-button" type="submit">
        Login
      </button>
    </form>
  );
}

function StepIndicator({
  currentStep,
  signupStep,
  totalSteps
}: {
  currentStep: number;
  signupStep: SignupStep;
  totalSteps: number;
}) {
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

function PhoneStep({
  codeStatus,
  errors,
  form,
  onBack,
  onNext,
  onSendCode,
  onUpdate
}: {
  codeStatus: "idle" | "sending" | "sent" | "verified";
  errors: Record<string, string>;
  form: SignupForm;
  onBack: () => void;
  onNext: () => void;
  onSendCode: () => void;
  onUpdate: <K extends keyof SignupForm>(field: K, value: SignupForm[K]) => void;
}) {
  return (
    <form
      className="auth-form"
      onSubmit={(event) => {
        event.preventDefault();
        onNext();
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
            onClick={onSendCode}
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
            : "For this demo, use code 123456."
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

function CredentialsStep({
  errors,
  form,
  onBack,
  onNext,
  onUpdate
}: {
  errors: Record<string, string>;
  form: SignupForm;
  onBack: () => void;
  onNext: () => void;
  onUpdate: <K extends keyof SignupForm>(field: K, value: SignupForm[K]) => void;
}) {
  return (
    <form
      className="auth-form"
      onSubmit={(event) => {
        event.preventDefault();
        onNext();
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

function RoleStep({
  errors,
  form,
  onBack,
  onCompleteStaff,
  onNext,
  onUpdate
}: {
  errors: Record<string, string>;
  form: SignupForm;
  onBack: () => void;
  onCompleteStaff: () => void;
  onNext: () => void;
  onUpdate: <K extends keyof SignupForm>(field: K, value: SignupForm[K]) => void;
}) {
  const isStaffRole = form.role === "director" || form.role === "teacher";

  return (
    <form
      className="auth-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (isStaffRole) {
          onCompleteStaff();
        } else {
          onNext();
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

      <FormActions
        nextLabel={isStaffRole ? "Complete registration" : "Next"}
        onBack={onBack}
      />
    </form>
  );
}

function ChildStep({
  errors,
  form,
  onBack,
  onImageChange,
  onSubmit,
  onUpdate
}: {
  errors: Record<string, string>;
  form: SignupForm;
  onBack: () => void;
  onImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdate: <K extends keyof SignupForm>(field: K, value: SignupForm[K]) => void;
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

function RelationshipStep({
  errors,
  form,
  onBack,
  onSubmit,
  onUpdate
}: {
  errors: Record<string, string>;
  form: SignupForm;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdate: <K extends keyof SignupForm>(field: K, value: SignupForm[K]) => void;
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

      <FormActions nextLabel="Complete registration" onBack={onBack} />
    </form>
  );
}

function ChildConfirmationModal({
  form,
  onConfirm,
  onEdit
}: {
  form: SignupForm;
  onConfirm: () => void;
  onEdit: () => void;
}) {
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

function Field({
  children,
  error,
  helper,
  id,
  label
}: {
  children: React.ReactNode;
  error?: string;
  helper?: string;
  id: string;
  label: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {helper ? <p className="field-helper">{helper}</p> : null}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

function FormActions({
  nextLabel,
  onBack
}: {
  nextLabel: string;
  onBack: () => void;
}) {
  return (
    <div className="form-actions">
      <button className="secondary-button" type="button" onClick={onBack}>
        Back
      </button>
      <button className="primary-button" type="submit">
        {nextLabel}
      </button>
    </div>
  );
}
