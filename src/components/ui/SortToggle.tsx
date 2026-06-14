import type { SortOrder } from "../../types";
import { Button } from "./Button";

interface SortToggleProps {
  value: SortOrder;
  onChange: (value: SortOrder) => void;
}

export function SortToggle({ value, onChange }: SortToggleProps) {
  return (
    <Button
      variant="ghost"
      type="button"
      onClick={() => onChange(value === "asc" ? "desc" : "asc")}
      className="text-xs"
    >
      {value === "asc" ? "↑ Crescente" : "↓ Decrescente"}
    </Button>
  );
}
