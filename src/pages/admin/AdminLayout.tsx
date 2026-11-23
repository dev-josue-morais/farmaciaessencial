import { Outlet } from 'react-router-dom'
import { AdminSidebar } from '../../components/admin/AdminSidebar'
import { isSupabaseConfigured } from '../../services/supabase'

export function AdminLayout() {
  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-workspace">
        <header className="admin-topbar">
          <div>
            <small>Farmácia Essencial</small>
            <strong>Painel administrativo</strong>
          </div>
          <div className="admin-avatar">FE</div>
        </header>
        {!isSupabaseConfigured && (
          <div className="admin-config-warning">
            Supabase não configurado: conecte as variáveis públicas antes de operar dados reais.
          </div>
        )}
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
