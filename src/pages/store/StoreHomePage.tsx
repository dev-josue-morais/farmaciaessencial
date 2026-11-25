import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { StoreHeader } from '../../components/store/StoreHeader'
import { ProductCard } from '../../components/store/ProductCard'
import { appConfig } from '../../config/appConfig'
import { getCatalog } from '../../services/catalogService'
import type { Product } from '../../types'

type Category = { id: string; name: string; slug: string; active: boolean; sortOrder: number }

export function StoreHomePage() {
  const [search, setSearch] = useState('')
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
        if (active) setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar a loja.')
      })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  function normalize(value: string) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
  }

  const filtered = products.filter((product) => normalize(product.name).includes(normalize(search)))

  function addToCart(product: Product) {
    const stored = localStorage.getItem('fe-cart')
    const cart: { productId: string; quantity: number }[] = stored ? JSON.parse(stored) : []
    const existing = cart.find((item) => item.productId === product.id)
    if (existing) {
      existing.quantity += 1
    } else {
      cart.push({ productId: product.id, quantity: 1 })
    }
    localStorage.setItem('fe-cart', JSON.stringify(cart))
  }

  return (
    <div className="store-page">
      <StoreHeader />
      <main>
        <section className="store-hero">
          <div>
            <span className="eyebrow">Saúde e cuidado para toda família</span>
            <h1>Bem-estar com a facilidade que você precisa.</h1>
            <p>Encontre produtos essenciais e receba com segurança no seu bairro.</p>
            <label className="store-search">
              <span>Buscar</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="O que você procura?"
              />
            </label>
          </div>
        </section>

        <section className="store-section">
          <div className="store-section__heading">
            <div>
              <small>Explore</small>
              <h2>Categorias</h2>
            </div>
            <Link to="/produtos">Ver catálogo</Link>
          </div>
          <div className="category-grid">
            {categories.filter((category) => category.active).map((category) => (
              <Link key={category.id} className="category-card" to={`/produtos?categoria=${category.slug}`}>
                <span>{category.name.charAt(0)}</span>
                <strong>{category.name}</strong>
              </Link>
            ))}
          </div>
        </section>

        <section className="store-section">
          <div className="store-section__heading">
            <div>
              <small>Selecionados para você</small>
              <h2>Produtos em destaque</h2>
            </div>
          </div>
          <div className="product-grid">
            {loading && <p>Carregando produtos...</p>}
            {error && <p className="account-message account-message--error" role="alert">{error}</p>}
            {filtered.filter((product) => product.featured).map((product) => (
              <ProductCard key={product.id} product={product} onAdd={addToCart} />
            ))}
          </div>
        </section>
      </main>
      <footer className="store-footer">
        <strong>{appConfig.name}</strong>
        <span>Cuidado, confiança e conveniência.</span>
      </footer>
    </div>
  )
}
