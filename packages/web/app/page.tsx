import { appConfig } from "@kichkintoy/shared";

export default function HomePage() {
  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">Kichkintoy Web</p>
        <h1>{appConfig.name}</h1>
        <p>
          Director and teacher dashboard shell for the Uzbekistan kindergarten
          communication platform.
        </p>
      </section>
    </main>
  );
}
