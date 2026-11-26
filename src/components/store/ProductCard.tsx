import type { Product } from '../../types'
import { formatCurrency } from '../../utils/format'

interface ProductCardProps {
  product: Product
  onAdd: (product: Product) => void
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  const price = product.promotionalPrice ?? product.price

  return (
    <article className="product-card">
      <div className="product-card__image" aria-label={`Imagem de ${product.name}`}>
        {product.imageUrl
          ? <img src={product.imageUrl} alt={product.name} />
          : <span>{product.name.charAt(0)}</span>}
        {product.promotionalPrice && <b>Oferta</b>}
      </div>
      <div className="product-card__body">
        <small>{product.code}</small>
        <h3>{product.name}</h3>
        {product.promotionalPrice ? (
          <div className="product-card__prices">
            <del>{formatCurrency(product.price)}</del>
            <strong>{formatCurrency(price)}</strong>
          </div>
        ) : (
          <strong className="product-card__price">{formatCurrency(price)}</strong>
        )}
        <button type="button" onClick={() => onAdd(product)} disabled={product.stock === 0}>
          {product.stock === 0 ? 'Indisponível' : 'Adicionar'}
        </button>
      </div>
    </article>
  )
}
