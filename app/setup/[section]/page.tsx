export default function SetupSectionPage({ params }: { params: { section: string } }) {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">{params.section}</h1>
      </div>
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--surface-1)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)' }}>
        <p>Esta sección se construirá en la Fase 6.</p>
        <p style={{ fontSize: 12, marginTop: 8 }}><a href="/setup" style={{ color: 'var(--brand-500)' }}>← Volver a Configuración</a></p>
      </div>
    </div>
  )
}
