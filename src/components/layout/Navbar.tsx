import { useState } from "react";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Início" },
  { to: "/cadastro", label: "Cadastro" },
  { to: "/busca", label: "Busca" },
  { to: "/graficos", label: "Gráficos" },
  { to: "/status", label: "Status" },
  { to: "/estoque", label: "Estoque" },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-brand-pink/30 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 max-md:flex-wrap max-md:gap-x-2 max-md:gap-y-3">
        <div className="flex items-center gap-3 max-md:min-w-0 max-md:flex-1">
          <img src="/logo.svg" alt="Logo" className="h-12 w-12 max-lg:h-10 max-lg:w-10" />
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold text-brand-pink-deep max-lg:text-base md:max-lg:whitespace-nowrap">
              Michelle Maneira Bonecas
            </h1>
            <p className="text-xs text-gray-500">Gestão de vendas</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="rounded-xl p-2.5 text-brand-pink-deep transition active:bg-brand-pink/30 md:hidden"
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
            />
          </svg>
        </button>

        <nav
          className={`ml-auto flex flex-wrap gap-1 max-md:ml-0 max-md:w-full max-md:grid-cols-2 max-md:gap-2 ${
            menuOpen ? "max-md:grid" : "max-md:hidden"
          }`}
        >
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `rounded-xl px-3 py-2 text-sm font-medium transition max-md:py-3 max-md:text-center max-md:text-base ${
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
