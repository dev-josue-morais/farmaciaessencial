import { useEffect, useMemo, useState } from 'react'
import { StoreHeader } from '../../components/store/StoreHeader'
import { ProductCard } from '../../components/store/ProductCard'
import { getCatalog } from '../../services/catalogService'
import type { Category, Product } from '../../types'

export function CatalogPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getCatalog()
      .then((catalog) => {
        if (!active) return
        setCategories(catalog.categories)
        setProducts(catalog.products)
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar o catálogo.')
      })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  function normalize(value: string) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
  }

  const catalog = useMemo(() => products.filter((product) => {
    const matchesName = normalize(product.name).includes(normalize(search))
    const matchesCategory = category === 'all' || product.categoryId === category
    return matchesName && matchesCategory
  }), [category, search, products])

  function addToCart(product: Product) {
    const cart = JSON.parse(localStorage.getItem('fe-cart') ?? '[]') as { productId: string; quantity: number }[]
    const existing = cart.find((item) => item.productId === product.id)
    if (existing) existing.quantity += 1
    else cart.push({ productId: product.id, quantity: 1 })
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
            {loading && <p>Carregando produtos...</p>}
            {error && <p className="account-message account-message--error" role="alert">{error}</p>}
            {!loading && !error && catalog.length === 0 && <p>Nenhum produto encontrado.</p>}
            {catalog.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={addToCart} />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
