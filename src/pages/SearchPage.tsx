import { Navigate, Outlet, useLocation } from "react-router-dom";
import { SubNav } from "../components/layout/SubNav";

const subItems = [
  { key: "clientes", label: "Clientes" },
  { key: "produtos", label: "Produtos" },
  { key: "pedidos", label: "Pedidos" },
];

export function SearchPage() {
  const location = useLocation();

  if (location.pathname === "/busca" || location.pathname === "/busca/") {
    return <Navigate to="/busca/clientes" replace />;
  }

  return (
    <div className="section-card">
      <SubNav basePath="/busca" items={subItems} />
      <Outlet />
    </div>
  );
}
