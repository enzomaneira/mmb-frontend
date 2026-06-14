import { Navigate, Outlet, useLocation } from "react-router-dom";
import { SubNav } from "../components/layout/SubNav";

const subItems = [
  { key: "clientes", label: "Clientes" },
  { key: "produtos", label: "Produtos" },
  { key: "pedidos", label: "Pedidos" },
];

export function EditPage() {
  const location = useLocation();

  if (location.pathname === "/edicao" || location.pathname === "/edicao/") {
    return <Navigate to="/edicao/clientes" replace />;
  }

  return (
    <div className="section-card">
      <SubNav basePath="/edicao" items={subItems} />
      <Outlet />
    </div>
  );
}
