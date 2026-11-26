import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/produtos', label: 'Produtos' },
  { to: '/admin/categorias', label: 'Categorias' },
  { to: '/admin/estoque', label: 'Estoque' },
  { to: '/admin/pedidos', label: 'Pedidos' },
  { to: '/admin/entregas', label: 'Bairros e entregas' },
  { to: '/admin/usuarios', label: 'Usuários e permissões' },
  { to: '/admin/pagamentos', label: 'Pagamentos' },
  { to: '/admin/configuracoes', label: 'Configurações da loja' },
]

export function AdminSidebar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <aside className={`admin-sidebar${menuOpen ? ' admin-sidebar--open' : ''}`}>
      <div className="admin-sidebar__brand">
        <span>+</span>
        <strong>Farmácia Essencial</strong>
        <button
          className="admin-sidebar__toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="admin-navigation"
          aria-label={menuOpen ? 'Fechar menu administrativo' : 'Abrir menu administrativo'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
      <nav id="admin-navigation" aria-label="Navegação administrativa">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.end} onClick={() => setMenuOpen(false)}>
            {link.label}
          </NavLink>
        ))}
      </nav>
      <NavLink className="admin-sidebar__store" to="/" onClick={() => setMenuOpen(false)}>
        Ver loja
      </NavLink>
    </aside>
  )
}
