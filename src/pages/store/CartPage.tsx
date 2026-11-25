import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { StoreHeader } from '../../components/store/StoreHeader'
import { useAuth } from '../../auth/AuthContext'
import { getCatalog } from '../../services/catalogService'
import { supabase } from '../../services/supabase'
import { formatCurrency } from '../../utils/format'
import type { Product } from '../../types'

interface CartEntry { productId: string; quantity: number }
interface AddressRow {
  id: string
  recipient_name: string
  postal_code: string
  street: string
  number: string
  complement: string | null
  neighborhood_id: string
  neighborhoods: { name: string; delivery_fee: number; minimum_order: number; available: boolean } | null
}

export function CartPage() {
  const { user } = useAuth()
  const [cart, setCart] = useState<CartEntry[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [addresses, setAddresses] = useState<AddressRow[]>([])
  const [addressId, setAddressId] = useState('')
  const [observations, setObservations] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('fe-cart') ?? '[]') as CartEntry[]
    setCart(stored.filter((item) => item.quantity > 0))
    let active = true
    getCatalog()
      .then((catalog) => active && setProducts(catalog.products))
      .catch((requestError) => active && setError(requestError instanceof Error ? requestError.message : 'Erro ao validar o carrinho.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!supabase || !user) return
    void supabase
      .from('addresses')
      .select('*, neighborhoods(name, delivery_fee, minimum_order, available)')
      .eq('user_id', user.id)
      .then(({ data, error: addressError }) => {
        if (addressError) {
          setError(addressError.message)
          return
        }
        const rows = (data ?? []) as AddressRow[]
        setAddresses(rows)
        const primary = rows.find((row) => 'is_primary' in row) as (AddressRow & { is_primary?: boolean }) | undefined
        setAddressId(primary?.is_primary ? primary.id : rows[0]?.id ?? '')
      })
  }, [user?.id])

  function persist(next: CartEntry[]) {
    setCart(next)
    localStorage.setItem('fe-cart', JSON.stringify(next))
  }
  function changeQuantity(productId: string, quantity: number) {
    const product = products.find((item) => item.id === productId)
    if (!product) return
    const safe = Math.max(1, Math.min(quantity, product.stock))
    persist(cart.map((item) => item.productId === productId ? { ...item, quantity: safe } : item))
  }
  function remove(productId: string) {
    persist(cart.filter((item) => item.productId !== productId))
  }

  const lines = cart.flatMap((entry) => {
    const product = products.find((item) => item.id === entry.productId)
    return product && product.status === 'active' && product.stock > 0
      ? [{ product, quantity: Math.min(entry.quantity, product.stock) }]
      : []
  })
  const subtotal = lines.reduce((sum, line) => sum + (line.product.promotionalPrice ?? line.product.price) * line.quantity, 0)
  const address = addresses.find((item) => item.id === addressId)
  const neighborhood = address?.neighborhoods
  const deliveryFee = neighborhood?.available ? Number(neighborhood.delivery_fee) : 0
  const minimumOrder = neighborhood ? Number(neighborhood.minimum_order) : 0
  const enough = !neighborhood || subtotal >= minimumOrder
  const total = subtotal + deliveryFee

  async function checkout() {
    setError(null)
    setMessage(null)
    if (!user) {
      setError('Entre na sua conta para finalizar o pedido.')
      return
    }
    if (!addressId) {
      setError('Selecione um endereço de entrega.')
      return
    }
    if (!neighborhood?.available) {
      setError('O bairro selecionado não está atendido.')
      return
    }
    if (!enough) {
      setError(`Faltam ${formatCurrency(minimumOrder - subtotal)} para atingir o mínimo de compra.`)
      return
    }
    if (!supabase) return
    setSubmitting(true)
    try {
      const idempotencyKey = crypto.randomUUID()
      const { data, error: rpcError } = await supabase.rpc('create_order', {
        p_address_id: addressId,
        p_items: lines.map((line) => ({ product_id: line.product.id, quantity: line.quantity })),
        p_idempotency_key: idempotencyKey,
        p_observations: observations.trim() || null,
      })
      if (rpcError) throw rpcError
      persist([])
      setMessage(`Pedido criado com sucesso. Identificador: ${data}`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível criar o pedido.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="store-page">
      <StoreHeader />
      <main className="simple-page">
        <small>Seu pedido</small>
        <h1>Carrinho</h1>
        {loading ? (
          <p aria-live="polite">Validando produtos e disponibilidade...</p>
        ) : lines.length === 0 ? (
          <div className="empty-state">
            <span>0</span>
            <h2>Seu carrinho está vazio</h2>
            <p>Adicione produtos disponíveis para continuar.</p>
            <Link to="/produtos">Ir para os produtos</Link>
          </div>
        ) : (
          <div className="cart-layout">
            <section className="cart-items">
              {lines.map(({ product, quantity }) => (
                <article className="cart-item" key={product.id}>
                  <div>
                    <small>{product.code}</small>
                    <h2>{product.name}</h2>
                    <strong>{formatCurrency(product.promotionalPrice ?? product.price)}</strong>
                  </div>
                  <label>
                    Quantidade
                    <input
                      type="number"
                      min="1"
                      max={product.stock}
                      value={quantity}
                      onChange={(event) => changeQuantity(product.id, Number(event.target.value))}
                    />
                  </label>
                  <button type="button" onClick={() => remove(product.id)}>Remover</button>
                </article>
              ))}
            </section>
            <aside className="cart-summary" aria-label="Resumo do pedido">
              <div><span>Subtotal</span><strong>{formatCurrency(subtotal)}</strong></div>
              <label>
                Endereço de entrega
                <select value={addressId} onChange={(event) => setAddressId(event.target.value)}>
                  <option value="">Selecione um endereço</option>
                  {addresses.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.recipient_name} - {item.street}, {item.number}
                    </option>
                  ))}
                </select>
              </label>
              {neighborhood && (
                <p className={neighborhood.available && enough ? 'account-message--success' : 'account-message--error'}>
                  {neighborhood.available
                    ? enough
                      ? `Entrega em ${neighborhood.name}: ${formatCurrency(deliveryFee)}`
                      : `Faltam ${formatCurrency(minimumOrder - subtotal)} para o mínimo de compra.`
                    : 'Bairro indisponível para entrega.'}
                </p>
              )}
              <label>
                Observações
                <textarea value={observations} onChange={(event) => setObservations(event.target.value)} />
              </label>
              <div><span>Entrega</span><strong>{formatCurrency(neighborhood?.available ? deliveryFee : 0)}</strong></div>
              <div><span>Total</span><strong>{formatCurrency(neighborhood?.available ? total : subtotal)}</strong></div>
              {!user && <Link to="/conta">Entre para finalizar</Link>}
              {addresses.length === 0 && user && <Link to="/conta">Cadastrar endereço</Link>}
              <button type="button" onClick={checkout} disabled={submitting || !neighborhood?.available || !enough || !addressId}>
                {submitting ? 'Criando pedido...' : 'Finalizar pedido'}
              </button>
            </aside>
          </div>
        )}
        {message && <p className="account-message account-message--success" role="status">{message}</p>}
        {error && <p className="account-message account-message--error" role="alert">{error}</p>}
      </main>
    </div>
  )
}
