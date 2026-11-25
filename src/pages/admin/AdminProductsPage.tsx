import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../services/supabase'

interface ProductRow {
  id: string
  name: string
  code: string
  price: number
  promotional_price: number | null
  stock: number
  status: 'active' | 'inactive'
  featured: boolean
}

export function AdminProductsPage() {
  const [items, setItems] = useState<ProductRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', code: '', description: '', price: '', promotionalPrice: '', stock: '0', status: 'active',
  })

  async function load() {
    if (!supabase) return
    const { data, error: queryError } = await supabase
      .from('products')
      .select('id, name, code, price, promotional_price, stock, status, featured')
      .order('name')
    if (queryError) setError(queryError.message)
    else setItems((data ?? []) as ProductRow[])
  }

  useEffect(() => { void load() }, [])

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    const price = Number(form.price)
    const stock = Number(form.stock)
    if (!form.name.trim() || !form.code.trim() || price < 0 || stock < 0) {
      setError('Informe nome, código, preço válido e estoque válido.')
      return
    }
    const { error: insertError } = await supabase.from('products').insert({
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description.trim(),
      price,
      promotional_price: form.promotionalPrice === '' ? null : Number(form.promotionalPrice),
      stock,
      status: form.status,
    })
    if (insertError) setError(insertError.message)
    else {
      setForm({ name: '', code: '', description: '', price: '', promotionalPrice: '', stock: '0', status: 'active' })
      await load()
    }
  }

  async function toggleStatus(item: ProductRow) {
    if (!supabase) return
    const status = item.status === 'active' ? 'inactive' : 'active'
    const { error: updateError } = await supabase.from('products').update({ status }).eq('id', item.id)
    if (updateError) setError(updateError.message)
    else await load()
  }

  return (
    <>
      <div className="admin-page-heading"><div><small>Gerenciamento</small><h1>Produtos</h1></div></div>
      {error && <p className="account-message account-message--error" role="alert">{error}</p>}
      <section className="admin-panel">
        <form className="account-card" onSubmit={createProduct}>
          <label>Nome<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Código/SKU<input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
          <label>Descrição<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label>Preço<input required type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label>
          <label>Preço promocional<input type="number" min="0" step="0.01" value={form.promotionalPrice} onChange={(event) => setForm({ ...form, promotionalPrice: event.target.value })} /></label>
          <label>Estoque<input required type="number" min="0" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} /></label>
          <button type="submit">Cadastrar produto</button>
        </form>
      </section>
      <section className="admin-panel" style={{ marginTop: 20 }}>
        <div className="admin-table">
          <div className="admin-table__head"><span>Produto</span><span>Código</span><span>Estoque</span><span>Preço</span><span>Status</span><span>Ação</span></div>
          {items.map((item) => (
            <div className="admin-table__row" key={item.id}>
              <span>{item.name}</span><span>{item.code}</span><span>{item.stock}</span><span>{item.price}</span><span>{item.status}</span>
              <button type="button" onClick={() => toggleStatus(item)}>{item.status === 'active' ? 'Desativar' : 'Ativar'}</button>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
