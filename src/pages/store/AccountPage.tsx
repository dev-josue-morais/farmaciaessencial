import { useState, type FormEvent } from 'react'
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
            {message && <p className="account-message account-message--success" role="status">{message}</p>}
            {error && <p className="account-message account-message--error" role="alert">{error}</p>}
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
