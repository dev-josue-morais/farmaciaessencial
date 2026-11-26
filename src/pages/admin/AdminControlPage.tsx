import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../services/supabase'
import { formatCurrency } from '../../utils/format'

type Module = 'categories' | 'neighborhoods' | 'settings' | 'orders' | 'stock' | 'users' | 'payments'

interface Props { module: Module }

interface CategoryRow { id: string; name: string; slug: string; description: string; image_url: string | null; active: boolean; sort_order: number }
interface NeighborhoodRow { id: string; name: string; delivery_fee: number; minimum_order: number; estimated_delivery: string | null; available: boolean; observations: string | null }
interface ProductRow { id: string; name: string; stock: number; minimum_stock: number }
interface MovementRow { id: string; product_id: string; quantity_delta: number; reason: string; created_at: string; products: { name: string } | null }

const titles: Record<Module, [string, string]> = {
  categories: ['Categorias', 'Organização do catálogo'],
  neighborhoods: ['Bairros e entregas', 'Taxas, mínimos e disponibilidade'],
  settings: ['Configurações da loja', 'Informações e regras gerais'],
  orders: ['Pedidos', 'Consulta e operação'],
  stock: ['Estoque', 'Movimentações e alertas'],
  users: ['Usuários e permissões', 'Perfis de acesso'],
  payments: ['Pagamentos', 'Integração e transações'],
}

export function AdminControlPage({ module }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodRow[]>([])
  const [products, setProducts] = useState<ProductRow[]>([])
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([])
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([])
  const [movements, setMovements] = useState<MovementRow[]>([])
  const [payments, setPayments] = useState<Array<Record<string, unknown>>>([])
  const [settings, setSettings] = useState<Record<string, unknown>>({})

  const [categoryForm, setCategoryForm] = useState({ id: '', name: '', slug: '', description: '', imageUrl: '', sortOrder: '0', active: true })
  const [neighborhoodForm, setNeighborhoodForm] = useState({ id: '', name: '', fee: '', minimum: '', estimated: '', available: true, observations: '' })
  const [stockForm, setStockForm] = useState({ productId: '', delta: '', reason: '' })

  const load = useCallback(async () => {
    if (!supabase) return
    setError(null)
    if (module === 'categories') {
      const { data, error: requestError } = await supabase.from('categories').select('*').order('sort_order')
      if (requestError) setError(requestError.message)
      else setCategories((data ?? []) as CategoryRow[])
    } else if (module === 'neighborhoods') {
      const { data, error: requestError } = await supabase.from('neighborhoods').select('*').order('name')
      if (requestError) setError(requestError.message)
      else setNeighborhoods((data ?? []) as NeighborhoodRow[])
    } else if (module === 'settings') {
      const { data, error: requestError } = await supabase.from('store_settings').select('*').eq('id', true).maybeSingle()
      if (requestError) setError(requestError.message)
      else setSettings((data ?? {}) as Record<string, unknown>)
    } else if (module === 'orders') {
      const { data, error: requestError } = await supabase.from('orders').select('*, profiles(full_name,phone), order_items(*, products(name))').order('created_at', { ascending: false })
      if (requestError) setError(requestError.message)
      else setOrders((data ?? []) as Array<Record<string, unknown>>)
    } else if (module === 'stock') {
      const [{ data: productData }, { data: movementData, error: movementError }] = await Promise.all([
        supabase.from('products').select('id,name,stock,minimum_stock').order('name'),
        supabase.from('stock_movements').select('*, products(name)').order('created_at', { ascending: false }).limit(100),
      ])
      setProducts((productData ?? []) as ProductRow[])
      if (movementError) setError(movementError.message)
      else setMovements((movementData ?? []) as unknown as MovementRow[])
    } else if (module === 'users') {
      const { data, error: requestError } = await supabase.from('profiles').select('*').order('full_name')
      if (requestError) setError(requestError.message)
      else setUsers((data ?? []) as Array<Record<string, unknown>>)
    } else if (module === 'payments') {
      const [{ data: settingsData }, { data: paymentData, error: paymentError }] = await Promise.all([
        supabase.from('store_settings').select('payment_environment,enabled_payment_methods,payment_account_reference').eq('id', true).maybeSingle(),
        supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(100),
      ])
      setSettings((settingsData ?? {}) as Record<string, unknown>)
      if (paymentError) setError(paymentError.message)
      else setPayments((paymentData ?? []) as Array<Record<string, unknown>>)
    }
  }, [module])

  useEffect(() => { void load() }, [load])

  async function saveCategory(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    const slug = categoryForm.slug.trim() || categoryForm.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
    const payload = { name: categoryForm.name.trim(), slug, description: categoryForm.description.trim(), image_url: categoryForm.imageUrl.trim() || null, sort_order: Number(categoryForm.sortOrder), active: categoryForm.active }
    if (!payload.name) { setError('Informe o nome da categoria.'); return }
    const request = categoryForm.id
      ? supabase.from('categories').update(payload).eq('id', categoryForm.id)
      : supabase.from('categories').insert(payload)
    const { error: requestError } = await request
    if (requestError) setError(requestError.message)
    else { setMessage(categoryForm.id ? 'Categoria atualizada.' : 'Categoria cadastrada.'); setCategoryForm({ id: '', name: '', slug: '', description: '', imageUrl: '', sortOrder: '0', active: true }); await load() }
  }

  async function saveNeighborhood(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    const fee = Number(neighborhoodForm.fee)
    const minimum = Number(neighborhoodForm.minimum)
    if (!neighborhoodForm.name.trim() || fee < 0 || minimum < 0) { setError('Informe nome, taxa e mínimo válidos.'); return }
    const payload = { name: neighborhoodForm.name.trim(), delivery_fee: fee, minimum_order: minimum, estimated_delivery: neighborhoodForm.estimated.trim() || null, available: neighborhoodForm.available, observations: neighborhoodForm.observations.trim() || null }
    const request = neighborhoodForm.id
      ? supabase.from('neighborhoods').update(payload).eq('id', neighborhoodForm.id)
      : supabase.from('neighborhoods').insert(payload)
    const { error: requestError } = await request
    if (requestError) setError(requestError.message)
    else { setMessage(neighborhoodForm.id ? 'Bairro atualizado.' : 'Bairro cadastrado.'); setNeighborhoodForm({ id: '', name: '', fee: '', minimum: '', estimated: '', available: true, observations: '' }); await load() }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    const { error: requestError } = await supabase.from('store_settings').update(settings).eq('id', true)
    if (requestError) setError(requestError.message)
    else setMessage('Configurações persistidas.')
  }

  async function updateOrderStatus(orderId: string, status: string) {
    if (!supabase) return
    if (!confirm('Alterar o status deste pedido?')) return
    const { error: requestError } = await supabase.rpc('update_order_status', { p_order_id: orderId, p_status: status })
    if (requestError) setError(requestError.message)
    else { setMessage('Status operacional atualizado.'); await load() }
  }

  async function addStock(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    const delta = Number(stockForm.delta)
    if (!stockForm.productId || !Number.isInteger(delta) || delta === 0 || !stockForm.reason.trim()) { setError('Selecione produto, informe quantidade diferente de zero e motivo.'); return }
    const { error: requestError } = await supabase.rpc('adjust_stock', { p_product_id: stockForm.productId, p_quantity_delta: delta, p_reason: stockForm.reason.trim() })
    if (requestError) setError(requestError.message)
    else { setMessage('Movimentação registrada.'); setStockForm({ productId: '', delta: '', reason: '' }); await load() }
  }

  async function setRole(userId: string, role: string) {
    if (!supabase) return
    if (!confirm(`Alterar o perfil deste usuário para ${role}?`)) return
    const { error: requestError } = await supabase.rpc('set_user_role', { p_user_id: userId, p_role: role })
    if (requestError) setError(requestError.message)
    else { setMessage('Permissão atualizada.'); await load() }
  }

  async function deleteCategory(item: CategoryRow) {
    if (!supabase) return
    if (!confirm(`Excluir a categoria "${item.name}"? Esta ação só é permitida sem produtos vinculados.`)) return
    const { error: requestError } = await supabase.from('categories').delete().eq('id', item.id)
    if (requestError) setError(requestError.message)
    else { setMessage('Categoria excluída.'); await load() }
  }

  const [title, subtitle] = titles[module]
  return (
    <>
      <div className="admin-page-heading"><div><small>{subtitle}</small><h1>{title}</h1></div></div>
      {error && <p className="account-message account-message--error" role="alert">{error}</p>}
      {message && <p className="account-message account-message--success" role="status">{message}</p>}

      {module === 'categories' && (
        <section className="admin-panel">
          <form className="admin-form" onSubmit={saveCategory}>
            <label>Nome<input required value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} /></label>
            <label>URL/slug<input value={categoryForm.slug} onChange={(event) => setCategoryForm({ ...categoryForm, slug: event.target.value })} /></label>
            <label>Descrição<textarea value={categoryForm.description} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} /></label>
            <label>Imagem ou ícone (URL)<input value={categoryForm.imageUrl} onChange={(event) => setCategoryForm({ ...categoryForm, imageUrl: event.target.value })} /></label>
            <label>Ordem<input type="number" value={categoryForm.sortOrder} onChange={(event) => setCategoryForm({ ...categoryForm, sortOrder: event.target.value })} /></label>
            <label>Status<select value={categoryForm.active ? 'active' : 'inactive'} onChange={(event) => setCategoryForm({ ...categoryForm, active: event.target.value === 'active' })}><option value="active">Ativa</option><option value="inactive">Inativa</option></select></label>
            <div className="admin-form__actions"><button type="submit">{categoryForm.id ? 'Salvar categoria' : 'Cadastrar categoria'}</button>{categoryForm.id && <button type="button" className="secondary" onClick={() => setCategoryForm({ id: '', name: '', slug: '', description: '', imageUrl: '', sortOrder: '0', active: true })}>Cancelar</button>}</div>
          </form>
          <div className="admin-table"><div className="admin-table__head admin-table__head--4"><span>Categoria</span><span>Ordem</span><span>Status</span><span>Ações</span></div>
            {categories.map((item) => <div className="admin-table__row admin-table__row--4" key={item.id}><span>{item.name}</span><span>{item.sort_order}</span><span>{item.active ? 'Ativa' : 'Inativa'}</span><span><button type="button" onClick={() => setCategoryForm({ id: item.id, name: item.name, slug: item.slug, description: item.description ?? '', imageUrl: item.image_url ?? '', sortOrder: String(item.sort_order), active: item.active })}>Editar</button><button type="button" className="secondary" onClick={() => void deleteCategory(item)}>Excluir</button></span></div>)}
          </div>
        </section>
      )}
      {module === 'neighborhoods' && (
        <section className="admin-panel">
          <form className="admin-form" onSubmit={saveNeighborhood}>
            <label>Bairro<input required value={neighborhoodForm.name} onChange={(event) => setNeighborhoodForm({ ...neighborhoodForm, name: event.target.value })} /></label>
            <label>Taxa de entrega<input required type="number" min="0" step="0.01" value={neighborhoodForm.fee} onChange={(event) => setNeighborhoodForm({ ...neighborhoodForm, fee: event.target.value })} /></label>
            <label>Valor mínimo para isenção<input required type="number" min="0" step="0.01" value={neighborhoodForm.minimum} onChange={(event) => setNeighborhoodForm({ ...neighborhoodForm, minimum: event.target.value })} /></label>
            <label>Prazo estimado<input value={neighborhoodForm.estimated} onChange={(event) => setNeighborhoodForm({ ...neighborhoodForm, estimated: event.target.value })} /></label>
            <label>Observações<textarea value={neighborhoodForm.observations} onChange={(event) => setNeighborhoodForm({ ...neighborhoodForm, observations: event.target.value })} /></label>
            <label>Atendimento<select value={neighborhoodForm.available ? 'yes' : 'no'} onChange={(event) => setNeighborhoodForm({ ...neighborhoodForm, available: event.target.value === 'yes' })}><option value="yes">Atendido</option><option value="no">Desativado</option></select></label>
            <div className="admin-form__actions"><button type="submit">{neighborhoodForm.id ? 'Salvar bairro' : 'Cadastrar bairro'}</button>{neighborhoodForm.id && <button type="button" className="secondary" onClick={() => setNeighborhoodForm({ id: '', name: '', fee: '', minimum: '', estimated: '', available: true, observations: '' })}>Cancelar</button>}</div>
          </form>
          <div className="admin-table"><div className="admin-table__head admin-table__head--5"><span>Bairro</span><span>Taxa</span><span>Mínimo</span><span>Status</span><span>Ações</span></div>
            {neighborhoods.map((item) => <div className="admin-table__row admin-table__row--5" key={item.id}><span>{item.name}</span><span>{formatCurrency(Number(item.delivery_fee))}</span><span>{formatCurrency(Number(item.minimum_order))}</span><span>{item.available ? 'Atendido' : 'Inativo'}</span><button type="button" onClick={() => setNeighborhoodForm({ id: item.id, name: item.name, fee: String(item.delivery_fee), minimum: String(item.minimum_order), estimated: item.estimated_delivery ?? '', available: item.available, observations: item.observations ?? '' })}>Editar</button></div>)}
          </div>
        </section>
      )}
      {module === 'settings' && (
        <section className="admin-panel">
          <form className="admin-form" onSubmit={saveSettings}>
            {[
              ['pharmacy_name','Nome da farmácia','text'],
              ['logo_url','Logotipo (URL)','url'],
              ['phone','Telefone','text'],
              ['whatsapp','WhatsApp','text'],
              ['email','E-mail','email'],
              ['business_address','Endereço comercial','text'],
              ['opening_hours','Horário de funcionamento','text'],
            ].map(([key, label, type]) => <label key={key}>{label}<input type={type} value={String(settings[key] ?? '')} onChange={(event) => setSettings({ ...settings, [key]: event.target.value })} /></label>)}
            {[
              ['institutional_text','Texto institucional'],
              ['store_notice','Avisos da loja'],
              ['delivery_info','Informações sobre entrega'],
              ['closed_message','Mensagem de loja fechada'],
            ].map(([key, label]) => <label key={key}>{label}<textarea value={String(settings[key] ?? '')} onChange={(event) => setSettings({ ...settings, [key]: event.target.value })} /></label>)}
            {[
              ['store_open','Loja aberta'],
              ['purchases_enabled','Compras habilitadas'],
              ['featured_enabled','Produtos em destaque'],
              ['show_out_of_stock','Exibir produtos sem estoque'],
              ['promotions_enabled','Promoções habilitadas'],
            ].map(([key, label]) => <label key={key}><input type="checkbox" checked={settings[key] !== false} onChange={(event) => setSettings({ ...settings, [key]: event.target.checked })} /> {label}</label>)}
            <div className="admin-form__actions"><button type="submit">Salvar configurações</button></div>
          </form>
        </section>
      )}
      {module === 'orders' && (
        <section className="admin-panel">
          <div className="admin-table"><div className="admin-table__head admin-table__head--5"><span>Pedido</span><span>Pagamento</span><span>Entrega</span><span>Total</span><span>Status operacional</span></div>
            {orders.map((order) => <div className="admin-table__row admin-table__row--5" key={String(order.id)}>
              <span>{String(order.id).slice(0,8)}</span><span>{String(order.payment_status)}</span><span>{formatCurrency(Number(order.delivery_fee))}</span><span>{formatCurrency(Number(order.total))}</span>
              <select value={String(order.status)} onChange={(event) => void updateOrderStatus(String(order.id), event.target.value)}>
                {['waiting_payment','payment_approved','preparing','ready','out_for_delivery','delivered','cancelled'].map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>)}
          </div>
        </section>
      )}
      {module === 'stock' && (
        <section className="admin-panel">
          <form className="admin-form" onSubmit={addStock}>
            <label>Produto<select required value={stockForm.productId} onChange={(event) => setStockForm({ ...stockForm, productId: event.target.value })}><option value="">Selecione</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name} (estoque {item.stock})</option>)}</select></label>
            <label>Quantidade (use negativo para saída)<input required type="number" value={stockForm.delta} onChange={(event) => setStockForm({ ...stockForm, delta: event.target.value })} /></label>
            <label>Motivo<input required value={stockForm.reason} onChange={(event) => setStockForm({ ...stockForm, reason: event.target.value })} /></label>
            <div className="admin-form__actions"><button type="submit">Registrar movimentação</button></div>
          </form>
          <h2 style={{ marginTop: 24 }}>Alertas de estoque baixo</h2>
          {products.filter((item) => item.stock <= item.minimum_stock).map((item) => <p key={item.id}>{item.name}: {item.stock} unidades (mínimo {item.minimum_stock})</p>)}
          <h2>Histórico</h2>
          <div className="admin-table"><div className="admin-table__head admin-table__head--4"><span>Produto</span><span>Movimento</span><span>Motivo</span><span>Data</span></div>
            {movements.map((item) => <div className="admin-table__row admin-table__row--4" key={item.id}><span>{item.products?.name ?? item.product_id}</span><span>{item.quantity_delta}</span><span>{item.reason}</span><span>{new Date(item.created_at).toLocaleString('pt-BR')}</span></div>)}
          </div>
        </section>
      )}
      {module === 'users' && (
        <section className="admin-panel"><div className="admin-table"><div className="admin-table__head admin-table__head--4"><span>Usuário</span><span>Telefone</span><span>Perfil</span><span>Ações</span></div>
          {users.map((user) => <div className="admin-table__row admin-table__row--4" key={String(user.id)}><span>{String(user.full_name)}</span><span>{String(user.phone ?? '')}</span><span>{String(user.role)}</span><select value={String(user.role)} onChange={(event) => void setRole(String(user.id), event.target.value)}><option value="customer">Cliente</option><option value="pharmacist">Farmacêutico</option><option value="admin">Administrador</option></select></div>)}
        </div></section>
      )}
      {module === 'payments' && (
        <section className="admin-panel">
          <form className="admin-form" onSubmit={saveSettings}>
            <label>Ambiente<select value={String(settings.payment_environment ?? 'test')} onChange={(event) => setSettings({ ...settings, payment_environment: event.target.value })}><option value="test">Testes</option><option value="production">Produção</option></select></label>
            <label>Identificação da conta<input value={String(settings.payment_account_reference ?? '')} onChange={(event) => setSettings({ ...settings, payment_account_reference: event.target.value })} /></label>
            <label>Formas habilitadas<select multiple value={(settings.enabled_payment_methods as string[] ?? ['cash'])} onChange={(event) => setSettings({ ...settings, enabled_payment_methods: Array.from(event.target.selectedOptions).map((option) => option.value) })}><option value="cash">Dinheiro</option><option value="pix">Pix</option><option value="card">Cartão</option></select></label>
            <div className="admin-form__actions"><button type="submit">Salvar configuração de pagamento</button></div>
          </form>
          <p><strong>Ambiente:</strong> {String(settings.payment_environment ?? 'test')}</p>
          <p><strong>Formas habilitadas:</strong> {(settings.enabled_payment_methods as string[] ?? []).join(', ') || 'Nenhuma'}</p>
          <p><strong>Conta identificada:</strong> {String(settings.payment_account_reference ?? 'Não configurada')}</p>
          <p>Credenciais privadas nunca são exibidas ou armazenadas pelo frontend.</p>
          <div className="admin-table"><div className="admin-table__head admin-table__head--5"><span>Pedido</span><span>Provedor</span><span>Método</span><span>Status</span><span>Valor</span></div>
            {payments.map((payment) => <div className="admin-table__row admin-table__row--5" key={String(payment.id)}><span>{String(payment.order_id).slice(0,8)}</span><span>{String(payment.provider)}</span><span>{String(payment.method ?? '')}</span><span>{String(payment.status)}</span><span>{formatCurrency(Number(payment.amount))}</span></div>)}
          </div>
        </section>
      )}
    </>
  )
}
