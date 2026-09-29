export default function CourtLoading() {
  return <main className="public-shell" role="status" aria-busy="true" aria-label="Carregando agenda">
    <div className="skeleton skeleton-header" />
    <div className="skeleton skeleton-title" />
    <div className="skeleton skeleton-notice" />
    <div className="skeleton skeleton-list" />
    <div className="skeleton skeleton-dock" />
  </main>;
}