"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { AuthResponse } from "@kichkintoy/shared";
import { AuthShell } from "@/components/auth-shell";
import { FieldError } from "@/components/field-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiRequest } from "@/lib/api";
import { persistSession, routeForMembership } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
    form?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const next: typeof errors = {};
    if (!username.trim()) next.username = "Username is required.";
    if (!password) next.password = "Password is required.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const response = await apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: { username, password },
      });
      persistSession(response);
      router.replace(
        routeForMembership(response.user.role, response.membership),
      );
    } catch (error) {
      setErrors({
        form:
          error instanceof ApiError
            ? error.message
            : "Username or password is incorrect.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      footer={
        <>
          New to Kichkintoy?{" "}
          <Link href="/signup" className="font-semibold text-primary">
            Create an account
          </Link>
        </>
      }
    >
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in to your Kichkintoy account.</CardDescription>
        </CardHeader>
        <CardContent>
          {errors.form ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{errors.form}</AlertDescription>
            </Alert>
          ) : null}

          <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="login-username">Username</Label>
              <Input
                id="login-username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="your_username"
                aria-invalid={errors.username ? "true" : undefined}
              />
              <FieldError message={errors.username} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
                aria-invalid={errors.password ? "true" : undefined}
              />
              <FieldError message={errors.password} />
            </div>

            <Button
              type="submit"
              size="lg"
              className="mt-2 w-full"
              disabled={submitting}
            >
              {submitting ? "Signing in…" : "Log in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
