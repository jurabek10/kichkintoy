export function AuthHero() {
  return (
    <section className="auth-hero" aria-labelledby="auth-heading">
      <div className="brand-pill">Kichkintoy Web</div>
      <h1 id="auth-heading">Connect kindergarten and families with care.</h1>
      <p>
        A calm, friendly space for directors, teachers, and parents to share a
        child's day, notices, albums, attendance, and care updates.
      </p>

      <div className="phone-preview" aria-hidden="true">
        <div className="phone-top" />
        <div className="preview-card primary">
          <span>Daily report</span>
          <strong>Ali had a happy morning.</strong>
        </div>
        <div className="preview-grid">
          <div>
            <span>Meals</span>
            <strong>Lunch done</strong>
          </div>
          <div>
            <span>Sleep</span>
            <strong>1h 20m</strong>
          </div>
        </div>
        <div className="preview-card">
          <span>Notice</span>
          <strong>Spring concert on Friday</strong>
        </div>
      </div>
    </section>
  );
}
