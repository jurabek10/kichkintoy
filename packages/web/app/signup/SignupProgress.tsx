"use client";

import { usePathname } from "next/navigation";
import { StepIndicator } from "@/components/step-indicator";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { stepIndexFor, useSignup } from "./SignupContext";

const labels: Record<string, string> = {
  "/signup": "signup.steps.phone",
  "/signup/credentials": "signup.steps.account",
  "/signup/role": "signup.steps.role",
  "/signup/center": "signup.steps.kindergarten",
  "/signup/class": "signup.steps.class",
  "/signup/director-setup": "signup.steps.centerSetup",
  "/signup/child": "signup.steps.child",
  "/signup/relationship": "signup.steps.relationship",
  "/signup/review": "signup.steps.review",
};

export function SignupProgress() {
  const { t } = useLayoutTranslation("app");
  const pathname = usePathname();
  const { draft } = useSignup();
  const { current, total } = stepIndexFor(pathname, draft);

  const matchKey = Object.keys(labels).find(
    (key) => pathname === key || pathname.startsWith(`${key}/`),
  );
  const label = matchKey ? t(labels[matchKey]) : undefined;

  return <StepIndicator current={current} total={total} label={label} />;
}
