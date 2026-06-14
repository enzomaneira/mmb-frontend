import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Início" },
  { to: "/cadastro", label: "Cadastro" },
  { to: "/busca", label: "Busca" },
  { to: "/graficos", label: "Gráficos" },
  { to: "/status", label: "Status" },
  { to: "/estoque", label: "Estoque" },
  { to: "/edicao", label: "Edição" },
];

export function Navbar() {
  return (
    <header className="border-b border-brand-pink/30 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Logo" className="h-12 w-12" />
          <div>
            <h1 className="font-display text-xl font-bold text-brand-pink-deep">
              Michelle Maneira Bonecas
            </h1>
            <p className="text-xs text-gray-500">Gestão de vendas</p>
          </div>
        </div>

        <nav className="ml-auto flex flex-wrap gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                `rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-pink text-white shadow"
                    : "text-gray-600 hover:bg-brand-yellow/60 hover:text-gray-900"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
