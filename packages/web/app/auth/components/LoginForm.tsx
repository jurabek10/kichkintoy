import { appConfig } from "@kichkintoy/shared";
import type { FormEvent } from "react";
import type { FormErrors } from "../types";
import { Field } from "./FormControls";

type LoginFormProps = {
  errors: FormErrors;
  isSubmitting: boolean;
  loginPassword: string;
  loginUsername: string;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUsernameChange: (value: string) => void;
};

export function LoginForm({
  errors,
  isSubmitting,
  loginPassword,
  loginUsername,
  onPasswordChange,
  onSubmit,
  onUsernameChange
}: LoginFormProps) {
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

      {errors.form ? <p className="field-error">{errors.form}</p> : null}

      <button className="primary-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
