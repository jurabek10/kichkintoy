"use client";

import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";
import { buildRegisterPayload, postAuth } from "./api";
import { authTokenStorageKey, initialSignupForm } from "./constants";
import { AuthHero } from "./components/AuthHero";
import { ChildConfirmationModal } from "./components/ChildConfirmationModal";
import { LoginForm } from "./components/LoginForm";
import {
  ChildStep,
  CredentialsStep,
  PhoneStep,
  RelationshipStep,
  RoleStep,
  StepIndicator
} from "./components/SignupSteps";
import type {
  AuthMode,
  AuthResponse,
  CodeStatus,
  FormErrors,
  SignupForm,
  SignupStep
} from "./types";
import {
  validateChild,
  validateCredentials,
  validatePhoneFields,
  validateRelationship,
  validateRole,
  validateSendCode
} from "./validation";

export function AuthPage() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [signupStep, setSignupStep] = useState<SignupStep>("phone");
  const [signupForm, setSignupForm] = useState<SignupForm>(initialSignupForm);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [codeStatus, setCodeStatus] = useState<CodeStatus>("idle");
  const [showChildModal, setShowChildModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      [field]: value,
      ...(field === "phoneNumber" || field === "verificationCode"
        ? { phoneVerificationToken: "" }
        : {})
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      delete next.form;
      return next;
    });

    if (field === "phoneNumber" || field === "verificationCode") {
      setCodeStatus("idle");
    }

    setSuccessMessage("");
  }

  function switchMode(nextMode: AuthMode) {
    setAuthMode(nextMode);
    setErrors({});
    setSuccessMessage("");
  }

  async function sendCode() {
    const nextErrors = validateSendCode(signupForm);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setCodeStatus("sending");
    setSuccessMessage("");

    try {
      const response = await postAuth<{
        debugCode?: string;
        expiresInSeconds: number;
        sent: boolean;
      }>("/auth/send-code", {
        phoneNumber: signupForm.phoneNumber
      });

      setCodeStatus("sent");
      setSuccessMessage(
        response.debugCode
          ? `Demo code sent. Use ${response.debugCode}.`
          : "Verification code sent by SMS."
      );
    } catch (error) {
      setCodeStatus("idle");
      setErrors({
        phoneNumber:
          error instanceof Error ? error.message : "Could not send code."
      });
    }
  }

  async function validatePhoneStep() {
    const nextErrors = validatePhoneFields(signupForm);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return false;
    }

    try {
      const response = await postAuth<{ verificationToken: string }>(
        "/auth/verify-code",
        {
          phoneNumber: signupForm.phoneNumber,
          code: signupForm.verificationCode
        }
      );

      updateSignupField("phoneVerificationToken", response.verificationToken);
      setCodeStatus("verified");
      return true;
    } catch (error) {
      setErrors({
        verificationCode:
          error instanceof Error
            ? error.message
            : "Verification code is incorrect."
      });
      return false;
    }
  }

  function applyValidation(validationErrors: FormErrors) {
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  }

  async function goToNextStep() {
    setSuccessMessage("");

    if (signupStep === "phone" && (await validatePhoneStep())) {
      setSignupStep("credentials");
      return;
    }

    if (signupStep === "credentials" && applyValidation(validateCredentials(signupForm))) {
      setSignupStep("role");
      return;
    }

    if (signupStep === "role" && applyValidation(validateRole(signupForm))) {
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

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};

    if (!loginUsername.trim()) {
      nextErrors.loginUsername = "Username is required.";
    }

    if (!loginPassword) {
      nextErrors.loginPassword = "Password is required.";
    }

    setErrors(nextErrors);
    setSuccessMessage("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await postAuth<AuthResponse>("/auth/login", {
        username: loginUsername,
        password: loginPassword
      });

      window.localStorage.setItem(authTokenStorageKey, response.session.token);
      setSuccessMessage(
        `Welcome back, ${response.user.fullName}. You are signed in as ${response.user.role}.`
      );
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : "Login failed."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function submitChildInfo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (applyValidation(validateChild(signupForm))) {
      setShowChildModal(true);
    }
  }

  function confirmChildInfo() {
    setShowChildModal(false);
    setSignupStep("relationship");
    setErrors({});
  }

  async function completeParentRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (applyValidation(validateRelationship(signupForm))) {
      await submitRegistration();
    }
  }

  async function completeStaffRegistration() {
    if (signupForm.role === "director" || signupForm.role === "teacher") {
      await submitRegistration();
    }
  }

  async function submitRegistration() {
    if (!signupForm.role) {
      setErrors({ role: "Select your role." });
      return;
    }

    if (!signupForm.phoneVerificationToken) {
      setErrors({ verificationCode: "Verify your phone number first." });
      setSignupStep("phone");
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setSuccessMessage("");

    try {
      const response = await postAuth<AuthResponse>(
        "/auth/register",
        buildRegisterPayload(signupForm)
      );

      window.localStorage.setItem(authTokenStorageKey, response.session.token);
      setSuccessMessage(
        `Registration complete. ${response.user.fullName} is signed in as ${response.user.role}.`
      );
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : "Registration failed."
      });
    } finally {
      setIsSubmitting(false);
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
      <AuthHero />

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
            isSubmitting={isSubmitting}
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
                isSubmitting={isSubmitting}
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
                isSubmitting={isSubmitting}
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
