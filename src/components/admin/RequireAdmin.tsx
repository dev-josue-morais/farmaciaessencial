import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { AdminLayout } from '../../pages/admin/AdminLayout'

export function RequireAdmin() {
  const { user, role, loading, error } = useAuth()
  const location = useLocation()

  if (loading) {
    return <main className="simple-page auth-status" aria-live="polite">Verificando acesso...</main>
  }

  if (!user) {
    return <Navigate to="/conta" replace state={{ from: location.pathname }} />
  }

  if (error) {
    return (
      <main className="simple-page auth-status">
        <small>Área restrita</small>
        <h1>Não foi possível verificar seu acesso</h1>
        <p>{error}</p>
        <Link to="/conta">Voltar para minha conta</Link>
      </main>
    )
  }

  if (role !== 'admin') {
    return (
      <main className="simple-page auth-status">
        <small>Área restrita</small>
        <h1>Acesso não autorizado</h1>
        <p>Esta área está disponível somente para usuários administradores.</p>
        <Link to="/">Voltar para a loja</Link>
      </main>
    )
  }

  return <AdminLayout />
}
