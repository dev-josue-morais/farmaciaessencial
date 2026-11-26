import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../services/supabase'
import { formatCurrency } from '../../utils/format'
import type { OpeningDay, OpeningSchedule } from '../../utils/storeHours'
import { appConfig } from '../../config/appConfig'

type Module = 'categories' | 'neighborhoods' | 'settings' | 'orders' | 'stock' | 'users' | 'payments'

interface Props { module: Module }

interface CategoryRow { id: string; name: string; slug: string; description: string; image_url: string | null; active: boolean; sort_order: number }
interface NeighborhoodRow { id: string; name: string; delivery_fee: number; minimum_order: number; estimated_delivery: string | null; available: boolean; observations: string | null }
interface ProductRow { id: string; name: string; stock: number; minimum_stock: number }
interface MovementRow { id: string; product_id: string; quantity_delta: number; reason: string; created_at: string; products: { name: string } | null }
interface AdminOrderRow extends Record<string, unknown> {
  id: string
  user_id: string
  status: string
  payment_status: string
  total: number
  delivery_fee: number
  created_at: string
  customer: { full_name: string; phone: string | null } | null
  order_items: Array<{ quantity: number; products: { name: string } | null }>
}
interface PaymentMethodRow {
  method: 'pix' | 'card'
  enabled: boolean
  provider: string | null
  adjustment_type: 'none' | 'surcharge' | 'discount'
  adjustment_unit: 'fixed' | 'percent'
  adjustment_value: number
}
interface PaymentProviderRow {
  provider: string
  environment: 'test' | 'production'
  account_reference: string | null
  credentials_configured: boolean
}

const paymentProviders = [
  ['mercado_pago', 'Mercado Pago'],
  ['infinitepay', 'InfinitePay'],
  ['picpay', 'PicPay'],
  ['next', 'Next'],
  ['nubank', 'Nubank'],
] as const

const openingDays = [
  ['monday', 'Segunda-feira'],
  ['tuesday', 'Terça-feira'],
  ['wednesday', 'Quarta-feira'],
  ['thursday', 'Quinta-feira'],
  ['friday', 'Sexta-feira'],
  ['saturday', 'Sábado'],
  ['sunday', 'Domingo'],
] as const

const defaultOpeningSchedule: OpeningSchedule = Object.fromEntries(
  openingDays.map(([day]) => [day, { enabled: false, open: '09:00', close: '18:00' }]),
) as OpeningSchedule

function parseOpeningSchedule(value: unknown): OpeningSchedule {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaultOpeningSchedule
  const saved = value as Record<string, unknown>
  return Object.fromEntries(openingDays.map(([key]) => {
    const day = saved[key]
    if (!day || typeof day !== 'object' || Array.isArray(day)) return [key, defaultOpeningSchedule[key]]
    const hours = day as Partial<OpeningDay>
    return [key, {
      enabled: hours.enabled === true,
      open: typeof hours.open === 'string' ? hours.open : '09:00',
      close: typeof hours.close === 'string' ? hours.close : '18:00',
    }]
  })) as OpeningSchedule
}

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
  const [orders, setOrders] = useState<AdminOrderRow[]>([])
  const [orderDate, setOrderDate] = useState('')
  const [orderStatus, setOrderStatus] = useState('')
  const [orderCustomer, setOrderCustomer] = useState('')
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([])
  const [movements, setMovements] = useState<MovementRow[]>([])
  const [payments, setPayments] = useState<Array<Record<string, unknown>>>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRow[]>([])
  const [providerSettings, setProviderSettings] = useState<PaymentProviderRow[]>([])
  const [credentialProvider, setCredentialProvider] = useState('mercado_pago')
  const [credentialForm, setCredentialForm] = useState({
    api_token: '',
    client_id: '',
    client_secret: '',
    webhook_secret: '',
    public_key: '',
  })
  const [settings, setSettings] = useState<Record<string, unknown>>({})
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [removeLogo, setRemoveLogo] = useState(false)

  const [categoryForm, setCategoryForm] = useState({ id: '', name: '', slug: '', description: '', imageUrl: '', sortOrder: '0', active: true })
  const [categoryImageFile, setCategoryImageFile] = useState<File | null>(null)
  const [categoryImagePreview, setCategoryImagePreview] = useState<string | null>(null)
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
      const { data, error: requestError } = await supabase.from('orders').select('*, order_items(*, products(name))').order('created_at', { ascending: false })
      if (requestError) {
        setError(requestError.message)
      } else {
        const orderRows = data ?? []
        if (orderRows.length === 0) {
          setOrders([])
        } else {
          const userIds = [...new Set(orderRows.map((order) => order.user_id))]
          const { data: profileRows, error: profileError } = await supabase
            .from('profiles')
            .select('id,full_name,phone')
            .in('id', userIds)
          if (profileError) {
            setError(profileError.message)
          } else {
            const profiles = new Map((profileRows ?? []).map((profile) => [profile.id, profile]))
            setOrders(orderRows.map((order) => ({
              ...order,
              customer: profiles.get(order.user_id) ?? null,
            })) as AdminOrderRow[])
          }
        }
      }
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
      const [
        { data: methodData, error: methodError },
        { data: providerData, error: providerError },
        { data: paymentData, error: paymentError },
      ] = await Promise.all([
        supabase.from('payment_method_settings').select('*').order('method'),
        supabase.from('payment_provider_settings').select('*').order('provider'),
        supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(100),
      ])
      if (methodError) setError(methodError.message)
      else setPaymentMethods((methodData ?? []) as PaymentMethodRow[])
      if (providerError) setError(providerError.message)
      else setProviderSettings((providerData ?? []) as PaymentProviderRow[])
      if (paymentError) setError(paymentError.message)
      else setPayments((paymentData ?? []) as Array<Record<string, unknown>>)
    }
  }, [module])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null)
      return
    }
    const preview = URL.createObjectURL(logoFile)
    setLogoPreview(preview)
    return () => URL.revokeObjectURL(preview)
  }, [logoFile])

  useEffect(() => {
    if (!categoryImageFile) {
      setCategoryImagePreview(null)
      return
    }
    const preview = URL.createObjectURL(categoryImageFile)
    setCategoryImagePreview(preview)
    return () => URL.revokeObjectURL(preview)
  }, [categoryImageFile])

  async function saveCategory(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setError(null)
    setMessage(null)
    const slug = categoryForm.slug.trim() || categoryForm.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
    if (!categoryForm.name.trim()) { setError('Informe o nome da categoria.'); return }
    if (!categoryForm.id && !categoryImageFile) {
      setError('Selecione uma imagem quadrada para a categoria.')
      return
    }
    let uploadedPath: string | null = null
    try {
      let imageUrl = categoryForm.imageUrl || null
      if (categoryImageFile) {
        const extensionByType: Record<string, string> = {
          'image/jpeg': 'jpg',
          'image/png': 'png',
          'image/webp': 'webp',
        }
        const extension = extensionByType[categoryImageFile.type]
        if (!extension || categoryImageFile.size > 5 * 1024 * 1024) {
          throw new Error('Use uma imagem JPG, PNG ou WEBP de até 5 MB.')
        }
        const bitmap = await createImageBitmap(categoryImageFile)
        const hasStandardDimensions = bitmap.width === 512 && bitmap.height === 512
        bitmap.close()
        if (!hasStandardDimensions) throw new Error('A imagem da categoria deve ter exatamente 512 × 512 pixels.')
        uploadedPath = `category-images/${crypto.randomUUID()}.${extension}`
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(uploadedPath, categoryImageFile, { contentType: categoryImageFile.type, upsert: false })
        if (uploadError) throw uploadError
        imageUrl = supabase.storage.from('product-images').getPublicUrl(uploadedPath).data.publicUrl
      }
      if (!imageUrl) throw new Error('A categoria precisa ter uma imagem.')
      const payload = {
        name: categoryForm.name.trim(),
        slug,
        description: categoryForm.description.trim(),
        image_url: imageUrl,
        sort_order: Number(categoryForm.sortOrder),
        active: categoryForm.active,
      }
      const request = categoryForm.id
        ? supabase.from('categories').update(payload).eq('id', categoryForm.id)
        : supabase.from('categories').insert(payload)
      const { error: requestError } = await request
      if (requestError) {
        if (uploadedPath) await supabase.storage.from('product-images').remove([uploadedPath])
        throw requestError
      }
      setMessage(categoryForm.id ? 'Categoria atualizada.' : 'Categoria cadastrada.')
      setCategoryForm({ id: '', name: '', slug: '', description: '', imageUrl: '', sortOrder: '0', active: true })
      setCategoryImageFile(null)
      await load()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível salvar a categoria.')
    }
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
    setError(null)
    setMessage(null)
    const hasOpeningSchedule = settings.opening_schedule != null
    const schedule = parseOpeningSchedule(settings.opening_schedule)
    const invalidDay = hasOpeningSchedule && openingDays.find(([key]) => {
      const day = schedule[key]
      return day.enabled && (!day.open || !day.close || day.open >= day.close)
    })
    if (invalidDay) {
      setError(`Confira os horários de ${invalidDay[1].toLowerCase()}: o fechamento deve ser depois da abertura.`)
      return
    }

    let uploadedPath: string | null = null
    try {
      let logoUrl = removeLogo ? null : String(settings.logo_url ?? '') || null
      if (logoFile) {
        const extensionByType: Record<string, string> = {
          'image/jpeg': 'jpg',
          'image/png': 'png',
          'image/webp': 'webp',
        }
        const extension = extensionByType[logoFile.type]
        if (!extension || logoFile.size > 5 * 1024 * 1024) {
          throw new Error('Use uma imagem JPG, PNG ou WEBP de até 5 MB.')
        }
        uploadedPath = `store-logo/${crypto.randomUUID()}.${extension}`
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(uploadedPath, logoFile, { contentType: logoFile.type, upsert: false })
        if (uploadError) throw uploadError
        logoUrl = supabase.storage.from('product-images').getPublicUrl(uploadedPath).data.publicUrl
      }

      const { error: requestError } = await supabase.from('store_settings').update({
        ...settings,
        logo_url: logoUrl,
        opening_schedule: hasOpeningSchedule ? schedule : null,
        updated_at: new Date().toISOString(),
      }).eq('id', true)
      if (requestError) {
        if (uploadedPath) await supabase.storage.from('product-images').remove([uploadedPath])
        throw requestError
      }
      setSettings((current) => ({ ...current, logo_url: logoUrl, opening_schedule: hasOpeningSchedule ? schedule : null }))
      setLogoFile(null)
      setRemoveLogo(false)
      setMessage('Configurações persistidas.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível salvar as configurações.')
    }
  }

  function updatePaymentMethod(method: PaymentMethodRow['method'], changes: Partial<PaymentMethodRow>) {
    setPaymentMethods((current) => {
      const existing = current.find((item) => item.method === method)
      const next = {
        method,
        enabled: false,
        provider: null,
        adjustment_type: 'none' as const,
        adjustment_unit: 'fixed' as const,
        adjustment_value: 0,
        ...existing,
        ...changes,
      }
      return [...current.filter((item) => item.method !== method), next]
    })
  }

  async function savePaymentMethods(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    const rows = (['pix', 'card'] as const).map((method) => {
      const item = paymentMethods.find((entry) => entry.method === method)
      return {
        method,
        enabled: item?.enabled ?? false,
        provider: item?.provider ?? null,
        adjustment_type: item?.adjustment_type ?? 'none',
        adjustment_unit: item?.adjustment_unit ?? 'fixed',
        adjustment_value: item?.adjustment_type === 'none' ? 0 : Number(item?.adjustment_value ?? 0),
        updated_at: new Date().toISOString(),
      }
    })
    if (rows.some((item) => item.enabled && !item.provider)) {
      setError('Selecione um provedor para cada forma de pagamento habilitada.')
      return
    }
    if (rows.some((item) => item.adjustment_value < 0 || (item.adjustment_unit === 'percent' && item.adjustment_value > 100))) {
      setError('O percentual deve estar entre 0 e 100; valores fixos não podem ser negativos.')
      return
    }
    const { error: saveError } = await supabase.from('payment_method_settings').upsert(rows, { onConflict: 'method' })
    if (saveError) setError(saveError.message)
    else {
      setPaymentMethods(rows as PaymentMethodRow[])
      setMessage('Regras de Pix e cartão salvas.')
    }
  }

  function updateProvider(provider: string, changes: Partial<PaymentProviderRow>) {
    setProviderSettings((current) => {
      const existing = current.find((item) => item.provider === provider)
      const next = {
        provider,
        environment: 'test' as const,
        account_reference: null,
        credentials_configured: false,
        ...existing,
        ...changes,
      }
      return [...current.filter((item) => item.provider !== provider), next]
    })
  }

  async function saveProviderSettings(provider: string) {
    if (!supabase) return
    const item = providerSettings.find((entry) => entry.provider === provider)
    if (!item) return
    const { data, error: saveError } = await supabase.from('payment_provider_settings').update({
      environment: item.environment,
      account_reference: item.account_reference?.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('provider', provider).select('provider').maybeSingle()
    if (saveError) setError(saveError.message)
    else if (!data) setError('Provedor não encontrado. Aplique a migration de configuração de pagamentos.')
    else setMessage('Ambiente e identificação da conta salvos.')
  }

  async function submitProviderCredentials(action: 'save' | 'clear') {
    if (!supabase) return
    setError(null)
    setMessage(null)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!session?.access_token) throw new Error('Sua sessão expirou. Entre novamente.')
      const response = await fetch(`${appConfig.supabaseUrl.replace(/\/$/, '')}/functions/v1/admin-payment-settings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: appConfig.supabasePublishableKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          provider: credentialProvider,
          ...(action === 'save' ? {
            credentials: Object.fromEntries(
              Object.entries(credentialForm).filter(([, value]) => value.trim()),
            ),
          } : {}),
        }),
      })
      const result = await response.json() as { error?: string; configured?: boolean }
      if (!response.ok) throw new Error(result.error ?? 'Não foi possível salvar as credenciais.')
      setCredentialForm({ api_token: '', client_id: '', client_secret: '', webhook_secret: '', public_key: '' })
      setMessage(action === 'save' ? 'Credenciais criptografadas e salvas no Supabase.' : 'Credenciais removidas.')
      await load()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível processar as credenciais.')
    }
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
  const currentSchedule = parseOpeningSchedule(settings.opening_schedule)
  const hasOpeningSchedule = settings.opening_schedule != null
  const visibleOrders = orders.filter((order) => {
    const matchesStatus = !orderStatus || order.status === orderStatus
    const matchesCustomer = !orderCustomer
      || order.customer?.full_name.toLocaleLowerCase().includes(orderCustomer.toLocaleLowerCase())
      || order.customer?.phone?.includes(orderCustomer)
      || order.id.toLowerCase().includes(orderCustomer.toLowerCase())
    const createdDate = new Date(order.created_at)
    const localDate = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}-${String(createdDate.getDate()).padStart(2, '0')}`
    return matchesStatus && matchesCustomer && (!orderDate || localDate === orderDate)
  })
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
            <label className="admin-category-image-field">Imagem quadrada da categoria
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required={!categoryForm.id && !categoryImageFile}
                onChange={(event) => setCategoryImageFile(event.target.files?.[0] ?? null)}
              />
              <span>Obrigatório: 512 × 512 pixels; JPG, PNG ou WEBP até 5 MB.</span>
              {(categoryImagePreview || categoryForm.imageUrl) && (
                <img
                  className="admin-category-image-preview"
                  src={categoryImagePreview ?? categoryForm.imageUrl}
                  alt="Pré-visualização da imagem da categoria"
                />
              )}
            </label>
            <label>Ordem<input type="number" value={categoryForm.sortOrder} onChange={(event) => setCategoryForm({ ...categoryForm, sortOrder: event.target.value })} /></label>
            <label>Status<select value={categoryForm.active ? 'active' : 'inactive'} onChange={(event) => setCategoryForm({ ...categoryForm, active: event.target.value === 'active' })}><option value="active">Ativa</option><option value="inactive">Inativa</option></select></label>
            <div className="admin-form__actions"><button type="submit">{categoryForm.id ? 'Salvar categoria' : 'Cadastrar categoria'}</button>{categoryForm.id && <button type="button" className="secondary" onClick={() => { setCategoryImageFile(null); setCategoryForm({ id: '', name: '', slug: '', description: '', imageUrl: '', sortOrder: '0', active: true }) }}>Cancelar</button>}</div>
          </form>
          <div className="admin-table"><div className="admin-table__head admin-table__head--4"><span>Categoria</span><span>Ordem</span><span>Status</span><span>Ações</span></div>
            {categories.map((item) => <div className="admin-table__row admin-table__row--4" key={item.id}><span className="admin-category-cell">{item.image_url && <img src={item.image_url} alt="" />}{item.name}</span><span>{item.sort_order}</span><span>{item.active ? 'Ativa' : 'Inativa'}</span><span><button type="button" onClick={() => { setCategoryImageFile(null); setCategoryForm({ id: item.id, name: item.name, slug: item.slug, description: item.description ?? '', imageUrl: item.image_url ?? '', sortOrder: String(item.sort_order), active: item.active }) }}>Editar</button><button type="button" className="secondary" onClick={() => void deleteCategory(item)}>Excluir</button></span></div>)}
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
            <label className="admin-logo-field">Logotipo da loja
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  setLogoFile(event.target.files?.[0] ?? null)
                  setRemoveLogo(false)
                }}
              />
              <span>JPG, PNG ou WEBP; máximo de 5 MB.</span>
              {(logoPreview || (Boolean(settings.logo_url) && !removeLogo)) && (
                <img
                  className="admin-logo-preview"
                  src={logoPreview ?? String(settings.logo_url)}
                  alt="Pré-visualização do logotipo"
                />
              )}
              {Boolean(settings.logo_url) && !removeLogo && (
                <button type="button" className="secondary" onClick={() => { setLogoFile(null); setRemoveLogo(true) }}>
                  Remover logotipo
                </button>
              )}
              {removeLogo && <span>O logotipo será removido ao salvar.</span>}
            </label>
            {[
              ['pharmacy_name','Nome da farmácia','text'],
              ['phone','Telefone','text'],
              ['whatsapp','WhatsApp','text'],
              ['email','E-mail','email'],
              ['business_address','Endereço comercial','text'],
            ].map(([key, label, type]) => <label key={key}>{label}<input type={type} value={String(settings[key] ?? '')} onChange={(event) => setSettings({ ...settings, [key]: event.target.value })} /></label>)}
            <div className="admin-opening-hours">
              <div>
                <h2>Horário de atendimento</h2>
                <p>Ative esta regra para limitar pedidos aos períodos definidos. Fuso de Brasília.</p>
              </div>
              <label className="admin-opening-hours__schedule-toggle">
                <input
                  type="checkbox"
                  checked={hasOpeningSchedule}
                  onChange={(event) => setSettings({
                    ...settings,
                    opening_schedule: event.target.checked ? currentSchedule : null,
                  })}
                />
                Aplicar horário semanal e bloquear pedidos fora do expediente
              </label>
              {openingDays.map(([key, label]) => {
                const day = currentSchedule[key]
                return (
                  <div className="admin-opening-hours__day" key={key}>
                    <label className="admin-opening-hours__enabled">
                      <input
                        type="checkbox"
                        checked={day.enabled}
                        disabled={!hasOpeningSchedule}
                        onChange={(event) => setSettings({
                          ...settings,
                          opening_schedule: { ...currentSchedule, [key]: { ...day, enabled: event.target.checked } },
                        })}
                      />
                      {label}
                    </label>
                    <label>Abre
                      <input
                        type="time"
                        value={day.open}
                        disabled={!hasOpeningSchedule || !day.enabled}
                        onChange={(event) => setSettings({
                          ...settings,
                          opening_schedule: { ...currentSchedule, [key]: { ...day, open: event.target.value } },
                        })}
                      />
                    </label>
                    <label>Fecha
                      <input
                        type="time"
                        value={day.close}
                        disabled={!hasOpeningSchedule || !day.enabled}
                        onChange={(event) => setSettings({
                          ...settings,
                          opening_schedule: { ...currentSchedule, [key]: { ...day, close: event.target.value } },
                        })}
                      />
                    </label>
                  </div>
                )
              })}
            </div>
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
          <div className="admin-order-filters">
            <label>Data<input type="date" value={orderDate} onChange={(event) => setOrderDate(event.target.value)} /></label>
            <label>Cliente<input value={orderCustomer} onChange={(event) => setOrderCustomer(event.target.value)} placeholder="Nome, telefone ou pedido" /></label>
            <label>Status<select value={orderStatus} onChange={(event) => setOrderStatus(event.target.value)}><option value="">Todos</option>{['waiting_payment','payment_approved','preparing','ready','out_for_delivery','delivered','cancelled'].map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          </div>
          <div className="admin-table"><div className="admin-table__head admin-table__head--orders"><span>Pedido / data</span><span>Cliente</span><span>Produtos</span><span>Pagamento</span><span>Total / entrega</span><span>Status</span></div>
            {visibleOrders.length === 0 && <div className="admin-table__empty">Nenhum pedido encontrado para os filtros selecionados.</div>}
            {visibleOrders.map((order) => <div className="admin-table__row admin-table__row--orders" key={order.id}>
              <span>{order.id.slice(0,8)}<small>{new Date(order.created_at).toLocaleString('pt-BR')}</small></span>
              <span>{order.customer?.full_name ?? `Cliente ${order.user_id.slice(0,8)}`}<small>{order.customer?.phone ?? ''}</small></span>
              <span>{order.order_items.map((item) => `${item.quantity}× ${item.products?.name ?? 'Produto'}`).join(', ') || 'Sem itens'}</span>
              <span>{order.payment_status}</span>
              <span>{formatCurrency(Number(order.total))}<small>Entrega {formatCurrency(Number(order.delivery_fee))}</small></span>
              <select value={order.status} onChange={(event) => void updateOrderStatus(order.id, event.target.value)}>
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
        <section className="admin-payments">
          <section className="admin-panel">
            <h2>Taxas por forma de pagamento</h2>
            <p>Defina acréscimo ou desconto fixo/percentual para Pix e cartão.</p>
            <p className="admin-payment-notice">As regras ficam salvas, mas não alteram o total do checkout até a escolha do meio e o fluxo de cobrança serem integrados.</p>
            <form className="admin-form" onSubmit={savePaymentMethods}>
              {(['pix', 'card'] as const).map((method) => {
                const config = paymentMethods.find((item) => item.method === method) ?? {
                  method,
                  enabled: false,
                  provider: null,
                  adjustment_type: 'none' as const,
                  adjustment_unit: 'fixed' as const,
                  adjustment_value: 0,
                }
                return (
                  <fieldset className="admin-payment-method" key={method}>
                    <legend>{method === 'pix' ? 'Pix' : 'Cartão'}</legend>
                    <label className="admin-payment-method__enabled">
                      <input type="checkbox" checked={config.enabled} onChange={(event) => updatePaymentMethod(method, { enabled: event.target.checked })} />
                      Habilitar após a integração do provedor
                    </label>
                    <label>Provedor
                      <select value={config.provider ?? ''} onChange={(event) => updatePaymentMethod(method, { provider: event.target.value || null })}>
                        <option value="">Selecione</option>
                        {paymentProviders.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                      </select>
                    </label>
                    <label>Regra de valor
                      <select value={config.adjustment_type} onChange={(event) => updatePaymentMethod(method, { adjustment_type: event.target.value as PaymentMethodRow['adjustment_type'] })}>
                        <option value="none">Sem alteração</option>
                        <option value="surcharge">Acréscimo</option>
                        <option value="discount">Desconto</option>
                      </select>
                    </label>
                    <label>Tipo
                      <select value={config.adjustment_unit} disabled={config.adjustment_type === 'none'} onChange={(event) => updatePaymentMethod(method, { adjustment_unit: event.target.value as PaymentMethodRow['adjustment_unit'] })}>
                        <option value="fixed">Valor fixo (R$)</option>
                        <option value="percent">Percentual (%)</option>
                      </select>
                    </label>
                    <label>Valor
                      <input
                        type="number"
                        min="0"
                        max={config.adjustment_unit === 'percent' ? '100' : undefined}
                        step="0.01"
                        disabled={config.adjustment_type === 'none'}
                        value={config.adjustment_value}
                        onChange={(event) => updatePaymentMethod(method, { adjustment_value: Number(event.target.value) })}
                      />
                    </label>
                  </fieldset>
                )
              })}
              <div className="admin-form__actions"><button type="submit">Salvar regras de pagamento</button></div>
            </form>
          </section>

          <section className="admin-panel">
            <h2>Provedores</h2>
            <p>Mercado Pago, InfinitePay, PicPay, Next e Nubank. As credenciais cadastradas são criptografadas e nunca retornam ao navegador.</p>
            <div className="admin-provider-list">
              {paymentProviders.map(([provider, label]) => {
                const config = providerSettings.find((item) => item.provider === provider) ?? {
                  provider,
                  environment: 'test' as const,
                  account_reference: null,
                  credentials_configured: false,
                }
                return (
                  <div className="admin-provider-row" key={provider}>
                    <strong>{label}</strong>
                    <label>Ambiente
                      <select value={config.environment} onChange={(event) => updateProvider(provider, { environment: event.target.value as PaymentProviderRow['environment'] })}>
                        <option value="test">Testes</option>
                        <option value="production">Produção</option>
                      </select>
                    </label>
                    <label>Identificação da conta
                      <input value={config.account_reference ?? ''} onChange={(event) => updateProvider(provider, { account_reference: event.target.value })} />
                    </label>
                    <span>{config.credentials_configured ? 'Credenciais cadastradas' : 'Credenciais não cadastradas'}</span>
                    <button type="button" onClick={() => void saveProviderSettings(provider)}>Salvar dados do provedor</button>
                  </div>
                )
              })}
            </div>
            <form className="admin-form admin-provider-credentials" onSubmit={(event) => { event.preventDefault(); void submitProviderCredentials('save') }}>
              <h3>Credenciais privadas</h3>
              <label>Provedor
                <select value={credentialProvider} onChange={(event) => setCredentialProvider(event.target.value)}>
                  {paymentProviders.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </label>
              <label>Token / chave de API<input type="password" autoComplete="new-password" value={credentialForm.api_token} onChange={(event) => setCredentialForm({ ...credentialForm, api_token: event.target.value })} /></label>
              <label>Client ID<input type="password" autoComplete="new-password" value={credentialForm.client_id} onChange={(event) => setCredentialForm({ ...credentialForm, client_id: event.target.value })} /></label>
              <label>Client Secret<input type="password" autoComplete="new-password" value={credentialForm.client_secret} onChange={(event) => setCredentialForm({ ...credentialForm, client_secret: event.target.value })} /></label>
              <label>Segredo do webhook<input type="password" autoComplete="new-password" value={credentialForm.webhook_secret} onChange={(event) => setCredentialForm({ ...credentialForm, webhook_secret: event.target.value })} /></label>
              <label>Chave pública<input type="password" autoComplete="new-password" value={credentialForm.public_key} onChange={(event) => setCredentialForm({ ...credentialForm, public_key: event.target.value })} /></label>
              <div className="admin-form__actions">
                <button type="submit">Criptografar e salvar credenciais</button>
                {providerSettings.find((item) => item.provider === credentialProvider)?.credentials_configured && (
                  <button type="button" className="secondary" onClick={() => void submitProviderCredentials('clear')}>Remover credenciais salvas</button>
                )}
              </div>
            </form>
            <p className="admin-payment-notice">Esta tela salva configurações e credenciais. A cobrança real por esses provedores só deve ser habilitada após instalar e validar a integração e os webhooks de cada um.</p>
          </section>

          <section className="admin-panel">
            <h2>Histórico de transações</h2>
          <div className="admin-table"><div className="admin-table__head admin-table__head--5"><span>Pedido</span><span>Provedor</span><span>Método</span><span>Status</span><span>Valor</span></div>
            {payments.map((payment) => <div className="admin-table__row admin-table__row--5" key={String(payment.id)}><span>{String(payment.order_id).slice(0,8)}</span><span>{String(payment.provider)}</span><span>{String(payment.method ?? '')}</span><span>{String(payment.status)}</span><span>{formatCurrency(Number(payment.amount))}</span></div>)}
          </div>
          </section>
        </section>
      )}
    </>
  )
}
