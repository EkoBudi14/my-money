import React from 'react'

export interface BrutalChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  colorScheme?: 'mint' | 'yellow' | 'sky' | 'peach'
}

export function BrutalChip({
  children,
  active = false,
  colorScheme = 'mint',
  className = '',
  ...props
}: BrutalChipProps) {
  const activeClass = active 
    ? `bg-[var(--neo-${colorScheme})] border-[var(--neo-ink)]` 
    : `bg-[var(--bg-elevated)] border-[var(--neo-ink)]`
    
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 border-[3px] rounded-full px-4 py-2 text-sm font-bold shadow-[var(--neo-shadow-xs)] transition-all hover:-translate-y-0.5 active:translate-y-0.5 ${activeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
