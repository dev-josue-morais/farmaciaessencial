import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { supabase } from '../../services/supabase'

const statuses = [
  ['preparing', 'Em preparação'],
  ['ready', 'Pronto para entrega'],
  ['out_for_delivery', 'Saiu para entrega'],
  ['delivered', 'Entregue'],
] as const

export function PharmacistPage() {
  const { user, role, loading } = useAuth()
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([])
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!supabase) return
    const { data, error: queryError } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name))')
      .order('created_at', { ascending: false })
    if (queryError) setError(queryError.message)
    else setOrders((data ?? []) as Array<Record<string, unknown>>)
  }

  useEffect(() => { if (role === 'pharmacist' || role === 'admin') void load() }, [role])

  async function updateStatus(orderId: string, status: string) {
    if (!supabase) return
    const { error: updateError } = await supabase.rpc('update_order_status', {
      p_order_id: orderId,
      p_status: status,
      p_notes: 'Atualização pelo painel operacional',
    })
    if (updateError) setError(updateError.message)
    else await load()
  }

  if (loading) return <main className="simple-page">Verificando acesso...</main>
  if (!user || (role !== 'pharmacist' && role !== 'admin')) {
    return <main className="simple-page"><h1>Acesso não autorizado</h1><Link to="/">Voltar à loja</Link></main>
  }

  return (
    <main className="simple-page">
      <small>Operação</small>
      <h1>Pedidos para atendimento</h1>
      {error && <p className="account-message account-message--error" role="alert">{error}</p>}
      {orders.length === 0 && <p>Nenhum pedido recebido.</p>}
      {orders.map((order) => (
        <section className="account-card" key={String(order.id)}>
          <h2>Pedido {String(order.id).slice(0, 8)}</h2>
          <p>Status atual: {String(order.status)}</p>
          <pre>{JSON.stringify(order.delivery_address, null, 2)}</pre>
          <select
            value={String(order.status)}
            onChange={(event) => void updateStatus(String(order.id), event.target.value)}
          >
            {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </section>
      ))}
    </main>
  )
}
