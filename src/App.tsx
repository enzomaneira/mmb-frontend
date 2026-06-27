import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { ChartsPage } from "./pages/ChartsPage";
import { Dashboard } from "./pages/Dashboard";
import { RegisterPage } from "./pages/RegisterPage";
import { SearchPage } from "./pages/SearchPage";
import { StatusPage } from "./pages/StatusPage";
import { StockPage } from "./pages/StockPage";
import { RegisterCustomer } from "./pages/register/RegisterCustomer";
import { RegisterOrder } from "./pages/register/RegisterOrder";
import { RegisterProduct } from "./pages/register/RegisterProduct";
import { SearchCustomers } from "./pages/search/SearchCustomers";
import { SearchOrders } from "./pages/search/SearchOrders";
import { SearchProducts } from "./pages/search/SearchProducts";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="cadastro" element={<RegisterPage />}>
            <Route path="clientes" element={<RegisterCustomer />} />
            <Route path="produtos" element={<RegisterProduct />} />
            <Route path="pedidos" element={<RegisterOrder />} />
          </Route>
          <Route path="busca" element={<SearchPage />}>
            <Route path="clientes" element={<SearchCustomers />} />
            <Route path="produtos" element={<SearchProducts />} />
            <Route path="pedidos" element={<SearchOrders />} />
          </Route>
          <Route path="graficos" element={<ChartsPage />} />
          <Route path="status" element={<StatusPage />} />
          <Route path="estoque" element={<StockPage />} />
          {/* Redirect legacy /edicao/* routes to /busca/* */}
          <Route path="edicao/clientes" element={<Navigate to="/busca/clientes" replace />} />
          <Route path="edicao/produtos" element={<Navigate to="/busca/produtos" replace />} />
          <Route path="edicao/pedidos" element={<Navigate to="/busca/pedidos" replace />} />
          <Route path="edicao" element={<Navigate to="/busca" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
