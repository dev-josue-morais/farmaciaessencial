import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { appConfig } from '../../config/appConfig'
import { supabase } from '../../services/supabase'

export function StoreHeader() {
  const { role } = useAuth()
  const [storeName, setStoreName] = useState(appConfig.name)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    let active = true
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('store_settings')
          .select('pharmacy_name,logo_url')
          .eq('id', true)
          .maybeSingle()
        if (!active) return
        if (error) {
          console.error('Não foi possível carregar as informações visuais da loja.', error)
          return
        }
        if (data?.pharmacy_name) setStoreName(data.pharmacy_name)
        setLogoUrl(data?.logo_url ?? null)
      } catch (error: unknown) {
        if (active) console.error('Não foi possível carregar as informações visuais da loja.', error)
      }
    })()
    return () => { active = false }
  }, [])

  return (
    <header className="store-header">
      <div className="store-header__inner">
        <Link className="brand" to="/" aria-label={`Página inicial - ${storeName}`}>
          {logoUrl
            ? <img className="brand__logo" src={logoUrl} alt="" />
            : <span className="brand__mark" aria-hidden="true">+</span>}
          <span>
            <strong>{storeName}</strong>
            <small>Cuidar é essencial</small>
          </span>
        </Link>
        <nav className="store-nav" aria-label="Navegação da loja">
          <NavLink to="/produtos">Produtos</NavLink>
          <NavLink to="/carrinho">Carrinho</NavLink>
          <NavLink to="/conta">Minha conta</NavLink>
        </nav>
        {role === 'admin' && (
          <Link className="admin-link" to="/admin">Área administrativa</Link>
        )}
      </div>
    </header>
  )
}
