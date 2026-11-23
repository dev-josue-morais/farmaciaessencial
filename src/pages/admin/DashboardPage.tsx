export function DashboardPage() {
  const cards = [
    ['Produtos cadastrados', '4'],
    ['Produtos ativos', '4'],
    ['Produtos inativos', '0'],
    ['Pedidos recebidos', '0'],
  ]
  const status = [
    ['Aguardando pagamento', 0],
    ['Pagamento aprovado', 0],
    ['Em preparação', 0],
    ['Pronto para entrega', 0],
    ['Saiu para entrega', 0],
    ['Entregue', 0],
  ]

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <small>Visão geral</small>
          <h1>Dashboard</h1>
        </div>
      </div>
      <section className="metric-grid">
        {cards.map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
      <section className="admin-panel">
        <div className="admin-panel__heading">
          <div>
            <small>Operação</small>
            <h2>Status dos pedidos</h2>
          </div>
        </div>
        <div className="status-grid">
          {status.map(([label, value]) => (
            <div key={String(label)}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
