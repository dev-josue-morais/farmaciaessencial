import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminPlaceholderPage } from './pages/admin/AdminPlaceholderPage'
import { RequireAdmin } from './components/admin/RequireAdmin'
import { DashboardPage } from './pages/admin/DashboardPage'
import { AccountPage } from './pages/store/AccountPage'
import { CartPage } from './pages/store/CartPage'
import { CatalogPage } from './pages/store/CatalogPage'
import { StoreHomePage } from './pages/store/StoreHomePage'
import { PharmacistPage } from './pages/admin/PharmacistPage'
import { AdminProductsPage } from './pages/admin/AdminProductsPage'

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
          element={
            <AdminPlaceholderPage
              title="Categorias"
              description="Organize categorias, ordem de exibição e disponibilidade na loja."
              action="Nova categoria"
              fields={['Categoria', 'Ordem', 'Status']}
            />
          }
        />
        <Route
          path="pedidos"
          element={
            <AdminPlaceholderPage
              title="Pedidos"
              description="Consulte pedidos, cliente, entrega, pagamento, itens e histórico de alterações."
              action="Atualizar lista"
              fields={['Pedido', 'Cliente', 'Pagamento', 'Entrega', 'Status', 'Total']}
            />
          }
        />
        <Route
          path="entregas"
          element={
            <AdminPlaceholderPage
              title="Bairros e entregas"
              description="Configure bairros atendidos, taxa independente, mínimo da compra e prazo."
              action="Novo bairro"
              fields={['Bairro', 'Taxa', 'Mínimo', 'Prazo', 'Disponibilidade']}
            />
          }
        />
        <Route
          path="configuracoes"
          element={
            <AdminPlaceholderPage
              title="Configurações"
              description="Regras comerciais e integrações externas devem ser definidas no backend protegido."
              action="Adicionar configuração"
              fields={['Configuração', 'Valor', 'Status']}
            />
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
