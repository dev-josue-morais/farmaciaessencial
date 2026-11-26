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
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__brand">
        <span>+</span>
        <strong>Farmácia Essencial</strong>
      </div>
      <nav aria-label="Navegação administrativa">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.end}>
            {link.label}
          </NavLink>
        ))}
      </nav>
      <NavLink className="admin-sidebar__store" to="/">
        Ver loja
      </NavLink>
    </aside>
  )
}
