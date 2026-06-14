import { Navigate, Outlet, useLocation } from "react-router-dom";
import { SubNav } from "../components/layout/SubNav";

const subItems = [
  { key: "clientes", label: "Clientes" },
  { key: "produtos", label: "Produtos" },
  { key: "pedidos", label: "Pedidos" },
];

export function RegisterPage() {
  const location = useLocation();

  if (location.pathname === "/cadastro" || location.pathname === "/cadastro/") {
    return <Navigate to="/cadastro/clientes" replace />;
  }

  return (
    <div className="section-card">
      <SubNav basePath="/cadastro" items={subItems} />
      <Outlet />
    </div>
  );
}
