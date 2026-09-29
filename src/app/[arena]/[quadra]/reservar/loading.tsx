export default function BookingLoading() {
  return <main className="public-shell booking-shell" role="status" aria-busy="true" aria-label="Carregando reservas">
    <div className="skeleton skeleton-header" />
    <div className="skeleton skeleton-title" />
    <div className="skeleton skeleton-calendar" />
    <div className="skeleton skeleton-list" />
  </main>;
}