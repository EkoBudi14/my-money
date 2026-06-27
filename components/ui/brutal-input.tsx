import React from 'react'

export interface BrutalInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const BrutalInput = React.forwardRef<HTMLInputElement, BrutalInputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full bg-[var(--bg-elevated)] border-[3px] border-[var(--neo-ink)] rounded-2xl px-4 py-3 text-[var(--text-primary)] font-semibold shadow-[var(--neo-shadow-sm)] focus:outline-none focus:ring-0 focus:border-[var(--neo-ink)] focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[2px_2px_0_var(--neo-ink)] transition-all ${className}`}
          {...props}
        />
        {error && (
          <span className="text-sm font-bold text-rose-500 mt-1">{error}</span>
        )}
      </div>
    )
  }
)

BrutalInput.displayName = 'BrutalInput'
