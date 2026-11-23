import { StoreHeader } from '../../components/store/StoreHeader'
import { isSupabaseConfigured } from '../../services/supabase'

export function AccountPage() {
  return (
    <div className="store-page">
      <StoreHeader />
      <main className="simple-page account-page">
        <div>
          <small>Minha conta</small>
          <h1>Acesso do cliente</h1>
          <p>Entre ou crie sua conta para salvar endereços e acompanhar pedidos.</p>
        </div>
        <form className="account-card" onSubmit={(event) => event.preventDefault()}>
          <label>E-mail<input type="email" name="email" required /></label>
          <label>Senha<input type="password" name="password" required /></label>
          <button type="submit">Entrar</button>
          <button type="button" className="secondary">Criar conta</button>
          {!isSupabaseConfigured && (
            <p className="configuration-note">
              Configure as variáveis públicas do Supabase para habilitar autenticação.
            </p>
          )}
        </form>
      </main>
    </div>
  )
}
