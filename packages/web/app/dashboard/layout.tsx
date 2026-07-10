import type { ReactNode } from "react";
import { SelectedChildProvider } from "@/lib/selected-child";
import { DashboardShell } from "./DashboardShell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SelectedChildProvider>
      <DashboardShell>{children}</DashboardShell>
    </SelectedChildProvider>
  );
}
