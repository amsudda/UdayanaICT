import React, { forwardRef } from 'react';
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label &&
        <label className="text-sm font-medium text-apple-text ml-1">
            {label}
          </label>
        }
        <input
          ref={ref}
          className={`
            flex h-12 w-full rounded-xl border border-apple-border bg-white px-4 py-2 text-base
            transition-all placeholder:text-apple-subtext
            focus:outline-none focus:ring-2 focus:ring-[#c20f24] focus:border-transparent
            disabled:cursor-not-allowed disabled:opacity-50
            ${error ? 'border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
          {...props} />

        {error &&
        <span className="text-sm text-red-500 ml-1 mt-0.5">{error}</span>
        }
      </div>);

  }
);
Input.displayName = 'Input';