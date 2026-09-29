export default function ReplayLoading() {
  return <main className="public-shell replay-shell" role="status" aria-busy="true" aria-label="Carregando replay">
    <div className="skeleton skeleton-header" />
    <div className="skeleton skeleton-player" />
    <div className="skeleton skeleton-title" />
    <div className="skeleton skeleton-actions" />
  </main>;
}