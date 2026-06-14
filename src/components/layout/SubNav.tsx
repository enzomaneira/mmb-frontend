import { NavLink } from "react-router-dom";

interface SubNavProps {
  basePath: string;
  items: { key: string; label: string }[];
}

export function SubNav({ basePath, items }: SubNavProps) {
  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b border-brand-pink/20 pb-4">
      {items.map((item) => (
        <NavLink
          key={item.key}
          to={`${basePath}/${item.key}`}
          className={({ isActive }) =>
            `rounded-lg px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-brand-yellow text-yellow-900"
                : "bg-brand-pink/20 text-gray-700 hover:bg-brand-pink/40"
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
