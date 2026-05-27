export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-sm font-medium text-destructive" role="alert">
      {message}
    </p>
  );
}

export function FieldHelper({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
