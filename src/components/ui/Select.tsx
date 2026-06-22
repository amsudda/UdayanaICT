import React, { forwardRef } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  placeholder?: string;
  options: string[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, placeholder, options, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-apple-text ml-1">{label}</label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`
              flex h-12 w-full appearance-none rounded-xl border border-apple-border bg-white px-4 py-2 pr-10 text-base
              transition-all
              focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent
              disabled:cursor-not-allowed disabled:opacity-50
              ${props.value ? 'text-apple-text' : 'text-apple-subtext'}
              ${error ? 'border-red-500 focus:ring-red-500' : ''}
              ${className}
            `}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt} value={opt} className="text-apple-text">
                {opt}
              </option>
            ))}
          </select>
          {/* chevron */}
          <svg
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-apple-subtext"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {error && <span className="text-sm text-red-500 ml-1 mt-0.5">{error}</span>}
      </div>
    );
  }
);
Select.displayName = 'Select';
