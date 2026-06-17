import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: string;
  prefix?: string;
  suffix?: string;
}

export function Input({
  label,
  error,
  hint,
  icon,
  prefix,
  suffix,
  className = "",
  id,
  required,
  type = "text",
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  const baseInput = `
    w-full rounded-xl border-2 bg-white px-4 py-2.5 text-sm font-medium
    shadow-sm outline-none transition-all duration-200
    placeholder:text-gray-300 placeholder:font-normal
    ${error
      ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-300/40"
      : "border-brand-pink/40 hover:border-brand-pink focus:border-brand-pink-deep focus:ring-2 focus:ring-brand-pink/30"
    }
    disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200
    [type=number]:[-moz-appearance:textfield] [type=number]:[&::-webkit-outer-spin-button]:appearance-none [type=number]:[&::-webkit-inner-spin-button]:appearance-none
  `;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="flex items-center gap-1 text-sm font-semibold text-gray-700">
          {icon && <span className="text-base leading-none">{icon}</span>}
          {label}
          {required && <span className="text-brand-pink-deep">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {prefix && (
          <span className="pointer-events-none absolute left-3 select-none text-sm font-semibold text-brand-pink-deep">
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          type={type}
          required={required}
          className={`
            ${baseInput}
            ${prefix ? "pl-8" : ""}
            ${suffix ? "pr-12" : ""}
            ${className}
          `}
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 select-none text-xs font-semibold text-gray-400">
            {suffix}
          </span>
        )}
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
