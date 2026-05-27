import type { ReactNode } from "react";

export function FormActions({
  back,
  next,
}: {
  back?: ReactNode;
  next: ReactNode;
}) {
  return (
    <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.5fr]">
      {back ? <div>{back}</div> : <div className="hidden sm:block" />}
      <div>{next}</div>
    </div>
  );
}
