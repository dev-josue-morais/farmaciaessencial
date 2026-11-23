import { Link, NavLink } from 'react-router-dom'
import { appConfig } from '../../config/appConfig'

export function StoreHeader() {
  return (
    <header className="store-header">
      <div className="store-header__inner">
        <Link className="brand" to="/" aria-label="Página inicial">
          <span className="brand__mark" aria-hidden="true">+</span>
          <span>
            <strong>{appConfig.name}</strong>
            <small>Cuidar é essencial</small>
          </span>
        </Link>
        <nav className="store-nav" aria-label="Navegação da loja">
          <NavLink to="/produtos">Produtos</NavLink>
          <NavLink to="/carrinho">Carrinho</NavLink>
          <NavLink to="/conta">Minha conta</NavLink>
        </nav>
        <Link className="admin-link" to="/admin">Área administrativa</Link>
      </div>
    </header>
  )
}
