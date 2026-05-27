import type { ReactNode } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Card, CardContent } from "@/components/ui/card";
import { SignupProvider } from "./SignupContext";
import { SignupProgress } from "./SignupProgress";

export default function SignupLayout({ children }: { children: ReactNode }) {
  return (
    <SignupProvider>
      <AuthShell>
        <Card>
          <CardContent className="flex flex-col gap-6 p-6 sm:p-8">
            <SignupProgress />
            {children}
          </CardContent>
        </Card>
      </AuthShell>
    </SignupProvider>
  );
}
