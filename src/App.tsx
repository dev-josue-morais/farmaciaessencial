import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAdmin } from './components/admin/RequireAdmin'
import { DashboardPage } from './pages/admin/DashboardPage'
import { AccountPage } from './pages/store/AccountPage'
import { CartPage } from './pages/store/CartPage'
import { CatalogPage } from './pages/store/CatalogPage'
import { StoreHomePage } from './pages/store/StoreHomePage'
import { PharmacistPage } from './pages/admin/PharmacistPage'
import { AdminProductsPage } from './pages/admin/AdminProductsPage'
import { AdminControlPage } from './pages/admin/AdminControlPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StoreHomePage />} />
      <Route path="/produtos" element={<CatalogPage />} />
      <Route path="/carrinho" element={<CartPage />} />
      <Route path="/conta" element={<AccountPage />} />
      <Route path="/farmaceutico" element={<PharmacistPage />} />
      <Route path="/admin" element={<RequireAdmin />}>
        <Route index element={<DashboardPage />} />
        <Route
          path="produtos"
          element={<AdminProductsPage />}
        />
        <Route
          path="categorias"
          element={<AdminControlPage module="categories" />}
        />
        <Route
          path="pedidos"
          element={<AdminControlPage module="orders" />}
        />
        <Route
          path="entregas"
          element={<AdminControlPage module="neighborhoods" />}
        />
        <Route
          path="configuracoes"
          element={<AdminControlPage module="settings" />}
        />
        <Route path="estoque" element={<AdminControlPage module="stock" />} />
        <Route path="usuarios" element={<AdminControlPage module="users" />} />
        <Route path="pagamentos" element={<AdminControlPage module="payments" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
