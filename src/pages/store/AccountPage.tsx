import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { StoreHeader } from '../../components/store/StoreHeader'
import { isSupabaseConfigured, supabase } from '../../services/supabase'

type AccountMode = 'signIn' | 'signUp'

export function AccountPage() {
  const { user, role, loading, error: authError, signOut } = useAuth()
  const [mode, setMode] = useState<AccountMode>('signIn')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [addresses, setAddresses] = useState<Array<{ id: string; recipient_name: string; postal_code: string; street: string; number: string }>>([])
  const [neighborhoods, setNeighborhoods] = useState<Array<{ id: string; name: string }>>([])
  const [addressForm, setAddressForm] = useState({
    recipientName: '', postalCode: '', street: '', number: '', complement: '', neighborhoodId: '', referencePoint: '',
  })

  useEffect(() => {
    if (!supabase || !user) return
    void supabase.from('profiles').select('phone').eq('id', user.id).maybeSingle()
      .then(({ data }) => setPhone((data?.phone as string) ?? ''))
    void supabase.from('addresses').select('id, recipient_name, postal_code, street, number').eq('user_id', user.id)
      .then(({ data }) => setAddresses((data ?? []) as typeof addresses))
    void supabase.from('neighborhoods').select('id, name').eq('available', true).order('name')
      .then(({ data }) => setNeighborhoods((data ?? []) as typeof neighborhoods))
  }, [user?.id])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setError(null)

    if (!supabase) {
      setError('O serviço de autenticação não está configurado.')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'signUp') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
          },
        })

        if (signUpError) throw signUpError
        setMessage(
          data.session
            ? 'Conta criada e acesso iniciado.'
            : 'Conta criada. Verifique seu e-mail para confirmar o cadastro antes de entrar.',
        )
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (signInError) throw signInError
        setMessage('Acesso efetuado.')
      }
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível concluir a solicitação. Tente novamente.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSignOut() {
    setMessage(null)
    setError(null)
    try {
      await signOut()
      setMessage('Você saiu da sua conta.')
    } catch (signOutError: unknown) {
      setError(
        signOutError instanceof Error
          ? signOutError.message
          : 'Não foi possível sair da conta. Tente novamente.',
      )
    }
  }

  function changeMode(nextMode: AccountMode) {
    setMode(nextMode)
    setMessage(null)
    setError(null)
  }

  async function resetPassword() {
    if (!supabase || !email.trim()) {
      setError('Informe seu e-mail para recuperar a senha.')
      return
    }
    setSubmitting(true)
    setError(null)
    setMessage(null)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/conta`,
    })
    setSubmitting(false)
    if (resetError) setError(resetError.message)
    else setMessage('Enviamos um link de recuperação para seu e-mail.')
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !user) return
    const { error: updateError } = await supabase.from('profiles').update({
      full_name: fullName.trim() || displayName,
      phone: phone.trim(),
    }).eq('id', user.id)
    if (updateError) setError(updateError.message)
    else setMessage('Dados cadastrais atualizados.')
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !user) return
    if (!addressForm.neighborhoodId) {
      setError('Selecione o bairro.')
      return
    }
    const { error: addressError } = await supabase.from('addresses').insert({
      user_id: user.id,
      recipient_name: addressForm.recipientName.trim(),
      postal_code: addressForm.postalCode.trim(),
      street: addressForm.street.trim(),
      number: addressForm.number.trim(),
      complement: addressForm.complement.trim() || null,
      neighborhood_id: addressForm.neighborhoodId,
      reference_point: addressForm.referencePoint.trim() || null,
    })
    if (addressError) {
      setError(addressError.message)
      return
    }
    setAddressForm({ recipientName: '', postalCode: '', street: '', number: '', complement: '', neighborhoodId: '', referencePoint: '' })
    setMessage('Endereço cadastrado.')
    const { data } = await supabase.from('addresses').select('id, recipient_name, postal_code, street, number').eq('user_id', user.id)
    setAddresses((data ?? []) as typeof addresses)
  }

  async function removeAddress(addressId: string) {
    if (!supabase) return
    const { error: deleteError } = await supabase.from('addresses').delete().eq('id', addressId)
    if (deleteError) setError(deleteError.message)
    else {
      setAddresses((items) => items.filter((item) => item.id !== addressId))
      setMessage('Endereço excluído.')
    }
  }

  const displayName = user?.user_metadata.full_name

  return (
    <div className="store-page">
      <StoreHeader />
      <main className="simple-page account-page">
        <div>
          <small>Minha conta</small>
          <h1>Acesso do cliente</h1>
          <p>Entre ou crie sua conta para salvar endereços e acompanhar pedidos.</p>
        </div>

        {loading ? (
          <section className="account-card auth-status" aria-live="polite">
            Carregando sua conta...
          </section>
        ) : user ? (
          <section className="account-card">
            <h2>Conta conectada</h2>
            <p>{typeof displayName === 'string' ? displayName : user.email}</p>
            {authError && <p className="account-message account-message--error" role="alert">{authError}</p>}
            {role === 'admin' && <Link to="/admin">Abrir painel administrativo</Link>}
            {role === 'pharmacist' && <Link to="/farmaceutico">Abrir painel operacional</Link>}
            {message && <p className="account-message account-message--success" role="status">{message}</p>}
            {error && <p className="account-message account-message--error" role="alert">{error}</p>}
            <form onSubmit={saveProfile}>
              <label>
                Nome completo
                <input value={typeof displayName === 'string' ? displayName : ''} onChange={(event) => setFullName(event.target.value)} />
              </label>
              <label>
                Telefone
                <input value={phone} onChange={(event) => setPhone(event.target.value)} />
              </label>
              <button type="submit">Salvar dados</button>
            </form>
            <h3>Endereços</h3>
            {addresses.map((item) => (
              <div className="address-row" key={item.id}>
                <span>{item.recipient_name} - {item.street}, {item.number}</span>
                <button type="button" className="secondary" onClick={() => removeAddress(item.id)}>Excluir</button>
              </div>
            ))}
            <form onSubmit={saveAddress}>
              <label>Destinatário<input required value={addressForm.recipientName} onChange={(event) => setAddressForm({ ...addressForm, recipientName: event.target.value })} /></label>
              <label>CEP<input required value={addressForm.postalCode} onChange={(event) => setAddressForm({ ...addressForm, postalCode: event.target.value })} /></label>
              <label>Rua<input required value={addressForm.street} onChange={(event) => setAddressForm({ ...addressForm, street: event.target.value })} /></label>
              <label>Número<input required value={addressForm.number} onChange={(event) => setAddressForm({ ...addressForm, number: event.target.value })} /></label>
              <label>Complemento<input value={addressForm.complement} onChange={(event) => setAddressForm({ ...addressForm, complement: event.target.value })} /></label>
              <label>Bairro<select required value={addressForm.neighborhoodId} onChange={(event) => setAddressForm({ ...addressForm, neighborhoodId: event.target.value })}><option value="">Selecione</option>{neighborhoods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label>Ponto de referência<input value={addressForm.referencePoint} onChange={(event) => setAddressForm({ ...addressForm, referencePoint: event.target.value })} /></label>
              <button type="submit">Cadastrar endereço</button>
            </form>
            <button type="button" onClick={handleSignOut} disabled={submitting}>
              Sair da conta
            </button>
          </section>
        ) : (
          <form className="account-card" onSubmit={handleSubmit}>
            <h2>{mode === 'signUp' ? 'Criar conta' : 'Entrar'}</h2>
            {mode === 'signUp' && (
              <label>
                Nome completo
                <input
                  type="text"
                  name="fullName"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                  disabled={!isSupabaseConfigured || submitting}
                />
              </label>
            )}
            <label>
              E-mail
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={!isSupabaseConfigured || submitting}
              />
            </label>
            <label>
              Senha
              <input
                type="password"
                name="password"
                autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={!isSupabaseConfigured || submitting}
              />
            </label>
            <button type="submit" disabled={!isSupabaseConfigured || submitting}>
              {submitting ? 'Aguarde...' : mode === 'signUp' ? 'Criar conta' : 'Entrar'}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => changeMode(mode === 'signUp' ? 'signIn' : 'signUp')}
              disabled={!isSupabaseConfigured || submitting}
            >
              {mode === 'signUp' ? 'Já tenho uma conta' : 'Criar conta'}
            </button>
            {mode === 'signIn' && (
              <button type="button" className="secondary" onClick={resetPassword} disabled={!isSupabaseConfigured || submitting}>
                Esqueci minha senha
              </button>
            )}
            {message && <p className="account-message account-message--success" role="status">{message}</p>}
            {error && <p className="account-message account-message--error" role="alert">{error}</p>}
            {authError && <p className="account-message account-message--error" role="alert">{authError}</p>}
            {!isSupabaseConfigured && (
              <p className="configuration-note">
                Configure as variáveis públicas do Supabase para habilitar autenticação.
              </p>
            )}
          </form>
        )}
      </main>
    </div>
  )
}
