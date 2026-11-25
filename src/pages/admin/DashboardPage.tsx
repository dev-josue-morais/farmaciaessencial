import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'

export function DashboardPage() {
  const [metrics, setMetrics] = useState({
    products: 0, active: 0, inactive: 0, outOfStock: 0, orders: 0, paidRevenue: 0,
  })
  const [status, setStatus] = useState<Array<[string, number]>>([])

  useEffect(() => {
    if (!supabase) return
    void (async () => {
      const [{ data: products }, { data: orders }] = await Promise.all([
        supabase.from('products').select('status, stock'),
        supabase.from('orders').select('status, payment_status, total'),
      ])
      const productRows = products ?? []
      const orderRows = orders ?? []
      setMetrics({
        products: productRows.length,
        active: productRows.filter((row) => row.status === 'active').length,
        inactive: productRows.filter((row) => row.status === 'inactive').length,
        outOfStock: productRows.filter((row) => Number(row.stock) === 0).length,
        orders: orderRows.length,
        paidRevenue: orderRows
          .filter((row) => row.payment_status === 'approved')
          .reduce((sum, row) => sum + Number(row.total), 0),
      })
      const labels: Record<string, string> = {
        waiting_payment: 'Aguardando pagamento',
        payment_approved: 'Pagamento aprovado',
        preparing: 'Em preparação',
        ready: 'Pronto para entrega',
        out_for_delivery: 'Saiu para entrega',
        delivered: 'Entregue',
      }
      setStatus(Object.entries(labels).map(([value, label]) => [
        label,
        orderRows.filter((row) => row.status === value).length,
      ]))
    })()
  }, [])

  const cards = [
    ['Produtos cadastrados', String(metrics.products)],
    ['Produtos ativos', String(metrics.active)],
    ['Produtos sem estoque', String(metrics.outOfStock)],
    ['Pedidos recebidos', String(metrics.orders)],
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
