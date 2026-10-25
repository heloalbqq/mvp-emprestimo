export function LoadingOverlay() {
  return (
    <div className="overlay" role="status" aria-live="polite">
      <div className="overlay-card">
        <div className="spinner" />
        <h3>Consultando os bancos</h3>
        <p>As consultas acontecem ao mesmo tempo. Leva só alguns segundos.</p>
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton short" />
      </div>
    </div>
  );
}