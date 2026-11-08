import { useState, type ReactNode } from "react";

const PAGE_SIZE = 40;

interface MobileCardsProps<T> {
  items: T[];
  getKey: (item: T) => number;
  renderCard: (item: T) => ReactNode;
  onSelect?: (item: T) => void;
  rowClassName?: string;
}

/** Lista em cartões usada no celular no lugar das tabelas. */
export function MobileCards<T>({
  items,
  getKey,
  renderCard,
  onSelect,
  rowClassName = "px-4 py-3",
}: MobileCardsProps<T>) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const remaining = items.length - limit;

  return (
    <div className="divide-y divide-gray-100">
      {items.slice(0, limit).map((item) =>
        onSelect ? (
          <button
            key={getKey(item)}
            type="button"
            onClick={() => onSelect(item)}
            className={`block w-full text-left transition active:bg-brand-pink/10 ${rowClassName}`}
          >
            {renderCard(item)}
          </button>
        ) : (
          <div key={getKey(item)} className={rowClassName}>
            {renderCard(item)}
          </div>
        ),
      )}
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + PAGE_SIZE)}
          className="w-full px-4 py-3 text-sm font-semibold text-brand-pink-deep active:bg-brand-pink/10"
        >
          Mostrar mais ({remaining} restante{remaining !== 1 ? "s" : ""})
        </button>
      )}
    </div>
  );
}
