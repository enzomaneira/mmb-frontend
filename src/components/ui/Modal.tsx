import { useEffect, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizes = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // No celular, impede a página de fundo de rolar junto com a janela
  useEffect(() => {
    if (!open || !window.matchMedia("(max-width: 767.98px)").matches) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 max-md:items-end max-md:p-0">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`relative z-10 w-full ${sizes[size]} max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl max-md:max-h-[94dvh] max-md:rounded-b-none`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-brand-pink/20 bg-white px-6 py-4 max-md:gap-2 max-md:px-4 max-md:py-3">
          {title && (
            <h2 className="font-display text-lg font-bold text-brand-pink-deep max-md:text-base">{title}</h2>
          )}
          <button
            onClick={onClose}
            className="ml-auto rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition max-md:shrink-0 max-md:p-2.5"
            aria-label="Fechar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5 max-md:px-4 max-md:py-4">{children}</div>
      </div>
    </div>
  );
}
