import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../services/supabase'
import { formatCurrency } from '../../utils/format'

interface ProductRow {
  id: string
  name: string
  code: string
  description: string
  category_id: string | null
  price: number
  promotional_price: number | null
  stock: number
  minimum_stock: number
  image_url: string | null
  gallery: string[]
  status: 'active' | 'inactive'
  featured: boolean
  available_for_sale: boolean
  requires_prescription: boolean
  controlled: boolean
  regulatory_class: string
  internal_notes: string
}

const emptyForm = {
  id: '',
  name: '',
  code: '',
  description: '',
  categoryId: '',
  price: '',
  promotionalPrice: '',
  stock: '0',
  minimumStock: '0',
  status: 'active',
  featured: false,
  availableForSale: true,
  requiresPrescription: false,
  controlled: false,
  regulatoryClass: 'common',
  internalNotes: '',
  gallery: '',
}

export function AdminProductsPage() {
  const [items, setItems] = useState<ProductRow[]>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [imageFile, setImageFile] = useState<File | null>(null)

  async function load() {
    if (!supabase) return
    const [{ data, error: queryError }, { data: categoryData }] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('categories').select('id,name').order('sort_order'),
    ])
    if (queryError) setError(queryError.message)
    else setItems((data ?? []) as ProductRow[])
    setCategories((categoryData ?? []) as Array<{ id: string; name: string }>)
  }

  useEffect(() => { void load() }, [])

  async function uploadImage(file: File) {
    if (!supabase) throw new Error('Supabase não configurado.')
    const path = `${crypto.randomUUID()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file, { upsert: false })
    if (uploadError) throw uploadError
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    return data.publicUrl
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
      event.preventDefault()
      if (!supabase) return
      setError(null)
      setMessage(null)
      const price = Number(form.price)
      const promotionalPrice = form.promotionalPrice === '' ? null : Number(form.promotionalPrice)
      const stock = Number(form.stock)
      const minimumStock = Number(form.minimumStock)
      if (!form.name.trim() || !form.code.trim()) {
        setError('Informe nome e código/SKU.')
        return
      }
      if (!Number.isFinite(price) || price < 0 || stock < 0 || minimumStock < 0) {
        setError('Preço e estoques não podem ser negativos.')
        return
      }
      if (promotionalPrice !== null && (promotionalPrice < 0 || promotionalPrice > price)) {
        setError('A promoção deve ser maior ou igual a zero e não pode superar o preço normal.')
        return
      }
      try {
        const imageUrl = imageFile ? await uploadImage(imageFile) : undefined
        const payload = {
          name: form.name.trim(),
          code: form.code.trim(),
          description: form.description.trim(),
          category_id: form.categoryId || null,
          price,
          promotional_price: promotionalPrice,
          stock,
          minimum_stock: minimumStock,
          ...(imageUrl ? { image_url: imageUrl } : {}),
          status: form.status,
          featured: form.featured,
          available_for_sale: form.availableForSale,
          requires_prescription: form.requiresPrescription,
          controlled: form.controlled,
          regulatory_class: form.regulatoryClass,
          internal_notes: form.internalNotes.trim(),
          gallery: form.gallery.split('\n').map((url) => url.trim()).filter(Boolean),
          updated_at: new Date().toISOString(),
        }
        const request = form.id
          ? supabase.from('products').update(payload).eq('id', form.id)
          : supabase.from('products').insert(payload)
        const { error: saveError } = await request
        if (saveError) throw saveError
        setMessage(form.id ? 'Produto atualizado.' : 'Produto cadastrado.')
        setForm(emptyForm)
        setImageFile(null)
        await load()
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Não foi possível salvar o produto.')
      }
    }

    function edit(item: ProductRow) {
      setForm({
        id: item.id,
        name: item.name,
        code: item.code,
        description: item.description ?? '',
        categoryId: item.category_id ?? '',
        price: String(item.price),
        promotionalPrice: item.promotional_price == null ? '' : String(item.promotional_price),
        stock: String(item.stock),
        minimumStock: String(item.minimum_stock ?? 0),
        status: item.status,
        featured: item.featured,
        availableForSale: item.available_for_sale,
        requiresPrescription: item.requires_prescription,
        controlled: item.controlled,
        regulatoryClass: item.regulatory_class ?? 'common',
        internalNotes: item.internal_notes ?? '',
        gallery: (item.gallery ?? []).join('\n'),
      })
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
        {message && <p className="account-message account-message--success" role="status">{message}</p>}
        <section className="admin-panel">
          <form className="admin-form" onSubmit={saveProduct}>
            <label>Nome<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>Código/SKU<input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
            <label>Categoria<select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}><option value="">Sem categoria</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Descrição<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <label>Preço normal<input required type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label>
            <label>Preço promocional<input type="number" min="0" step="0.01" value={form.promotionalPrice} onChange={(event) => setForm({ ...form, promotionalPrice: event.target.value })} /></label>
            <label>Estoque<input required type="number" min="0" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} /></label>
            <label>Estoque mínimo<input required type="number" min="0" value={form.minimumStock} onChange={(event) => setForm({ ...form, minimumStock: event.target.value })} /></label>
            <label>Foto principal<input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} /></label>
            <label>Galeria (uma URL por linha)<textarea value={form.gallery} onChange={(event) => setForm({ ...form, gallery: event.target.value })} /></label>
            <label>Classificação<select value={form.regulatoryClass} onChange={(event) => setForm({ ...form, regulatoryClass: event.target.value })}><option value="common">Comum</option><option value="controlled">Controlado</option><option value="prescription">Exige receita</option></select></label>
            <label>Observações internas<textarea value={form.internalNotes} onChange={(event) => setForm({ ...form, internalNotes: event.target.value })} /></label>
            <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as 'active' | 'inactive' })}><option value="active">Ativo</option><option value="inactive">Inativo</option></select></label>
            <div className="admin-checks">
              <label><input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} /> Destaque</label>
              <label><input type="checkbox" checked={form.availableForSale} onChange={(event) => setForm({ ...form, availableForSale: event.target.checked })} /> Disponível para venda</label>
              <label><input type="checkbox" checked={form.requiresPrescription} onChange={(event) => setForm({ ...form, requiresPrescription: event.target.checked })} /> Exige receita</label>
              <label><input type="checkbox" checked={form.controlled} onChange={(event) => setForm({ ...form, controlled: event.target.checked })} /> Controlado</label>
            </div>
            <div className="admin-form__actions"><button type="submit">{form.id ? 'Salvar alterações' : 'Cadastrar produto'}</button>{form.id && <button type="button" className="secondary" onClick={() => setForm(emptyForm)}>Cancelar edição</button>}</div>
          </form>
        </section>
        <section className="admin-panel" style={{ marginTop: 20 }}>
          <div className="admin-table">
            <div className="admin-table__head admin-table__head--products"><span>Produto</span><span>Código</span><span>Estoque</span><span>Preço</span><span>Status</span><span>Ações</span></div>
            {items.map((item) => (
              <div className="admin-table__row admin-table__row--products" key={item.id}>
                <span>{item.name}</span><span>{item.code}</span><span>{item.stock}{item.stock <= item.minimum_stock ? ' ⚠' : ''}</span><span>{formatCurrency(item.promotional_price ?? item.price)}</span><span>{item.status}</span>
                <span><button type="button" onClick={() => edit(item)}>Editar</button><button type="button" onClick={() => void toggleStatus(item)}>{item.status === 'active' ? 'Desativar' : 'Ativar'}</button></span>
              </div>
            ))}
          </div>
        </section>
      </>
    )
  }
