export default function PanelLoading() {
  return <div className="panel-page" role="status" aria-busy="true" aria-label="Carregando painel">
    <div className="panel-skeleton panel-skeleton-heading" />
    <div className="panel-skeleton panel-skeleton-metrics" />
    <div className="panel-skeleton panel-skeleton-content" />
  </div>;
}