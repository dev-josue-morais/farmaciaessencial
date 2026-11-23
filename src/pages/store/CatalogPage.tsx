import { useMemo, useState } from 'react'
import { StoreHeader } from '../../components/store/StoreHeader'
import { ProductCard } from '../../components/store/ProductCard'
import { categories, products } from '../../services/catalogService'
import type { Product } from '../../types'

export function CatalogPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  const catalog = useMemo(() => products.filter((product) => {
    const matchesName = product.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))
    const matchesCategory = category === 'all' || product.categoryId === category
    return matchesName && matchesCategory
  }), [category, search])

  function addToCart(product: Product) {
    const cart = JSON.parse(localStorage.getItem('fe-cart') ?? '[]') as { productId: string; quantity: number }[]
    const existing = cart.find((item) => item.productId === product.id)
    existing ? existing.quantity += 1 : cart.push({ productId: product.id, quantity: 1 })
    localStorage.setItem('fe-cart', JSON.stringify(cart))
  }

  return (
    <div className="store-page">
      <StoreHeader />
      <main className="catalog-page">
        <div className="catalog-toolbar">
          <div>
            <small>Loja virtual</small>
            <h1>Produtos</h1>
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar produtos"
          />
        </div>
        <div className="catalog-layout">
          <aside className="catalog-filter">
            <strong>Categorias</strong>
            <button className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>Todas</button>
            {categories.map((item) => (
              <button
                key={item.id}
                className={category === item.id ? 'active' : ''}
                onClick={() => setCategory(item.id)}
              >
                {item.name}
              </button>
            ))}
          </aside>
          <div className="product-grid">
            {catalog.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={addToCart} />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
