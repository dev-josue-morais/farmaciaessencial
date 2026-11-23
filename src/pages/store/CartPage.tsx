import { StoreHeader } from '../../components/store/StoreHeader'
import { formatCurrency } from '../../utils/format'

export function CartPage() {
  return (
    <div className="store-page">
      <StoreHeader />
      <main className="simple-page">
        <small>Seu pedido</small>
        <h1>Carrinho</h1>
        <div className="empty-state">
          <span>0</span>
          <h2>Seu carrinho está vazio</h2>
          <p>Adicione produtos para calcular entrega e prosseguir para o pagamento.</p>
          <a href="#/produtos">Ir para os produtos</a>
        </div>
        <div className="cart-summary" aria-label="Resumo do pedido">
          <div><span>Subtotal</span><strong>{formatCurrency(0)}</strong></div>
          <div><span>Entrega</span><strong>Calculada no checkout</strong></div>
          <div><span>Total</span><strong>{formatCurrency(0)}</strong></div>
        </div>
      </main>
    </div>
  )
}
