import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: string;
  options: { value: string; label: string; disabled?: boolean }[];
}

export function Select({
  label,
  error,
  hint,
  icon,
  options,
  className = "",
  id,
  required,
  ...props
}: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="flex items-center gap-1 text-sm font-semibold text-gray-700">
          {icon && <span className="text-base leading-none">{icon}</span>}
          {label}
          {required && <span className="text-brand-pink-deep">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          required={required}
          className={`
            w-full appearance-none rounded-xl border-2 bg-white px-4 py-2.5 pr-10 text-sm font-medium
            shadow-sm outline-none transition-all duration-200
            ${error
              ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-300/40"
              : "border-brand-pink/40 hover:border-brand-pink focus:border-brand-pink-deep focus:ring-2 focus:ring-brand-pink/30"
            }
            disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200
            ${className}
          `}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        {/* Custom dropdown arrow */}
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          <svg
            className={`h-4 w-4 transition-colors ${error ? "text-red-400" : "text-brand-pink-deep"}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      {error && (
        <p className="flex items-center gap-1 text-xs font-medium text-red-500">
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
