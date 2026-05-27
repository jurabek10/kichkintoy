"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FieldError, FieldHelper } from "@/components/field-error";
import { FormActions } from "@/components/form-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSignup } from "../SignupContext";

export default function CredentialsStep() {
  const router = useRouter();
  const { draft, setDraft } = useSignup();
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!draft.phoneVerificationToken) router.replace("/signup");
  }, [draft.phoneVerificationToken, router]);

  function submit() {
    const next: Record<string, string> = {};
    if (draft.username.trim().length < 3)
      next.username = "Username must be at least 3 characters.";
    if (draft.password.length < 8)
      next.password = "Password must be at least 8 characters.";
    else if (!/[A-Za-z]/.test(draft.password))
      next.password = "Password must include a letter.";
    else if (!/\d/.test(draft.password))
      next.password = "Password must include a number.";
    if (draft.password !== draft.confirmPassword)
      next.confirmPassword = "Passwords do not match.";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    router.push("/signup/role");
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Set your username and password
        </h1>
        <p className="text-sm text-muted-foreground">
          You will use these to sign in next time.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-username">Username</Label>
        <Input
          id="signup-username"
          autoComplete="username"
          value={draft.username}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              username: event.target.value,
            }))
          }
          placeholder="aziz_k"
        />
        {errors.username ? (
          <FieldError message={errors.username} />
        ) : (
          <FieldHelper>3–40 characters. Letters and numbers only.</FieldHelper>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          value={draft.password}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              password: event.target.value,
            }))
          }
          placeholder="At least 8 characters"
        />
        <FieldError message={errors.password} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-confirm-password">Confirm password</Label>
        <Input
          id="signup-confirm-password"
          type="password"
          autoComplete="new-password"
          value={draft.confirmPassword}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              confirmPassword: event.target.value,
            }))
          }
          placeholder="Repeat your password"
        />
        <FieldError message={errors.confirmPassword} />
      </div>

      <FormActions
        back={
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => router.back()}
          >
            Back
          </Button>
        }
        next={
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={submit}
          >
            Continue
          </Button>
        }
      />
    </div>
  );
}
