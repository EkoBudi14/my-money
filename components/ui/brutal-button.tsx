import React from 'react'

export interface BrutalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost'
  colorScheme?: 'yellow' | 'mint' | 'sky' | 'peach' | 'pink' | 'lav' | 'white'
  fullWidth?: boolean
}

export function BrutalButton({
  children,
  variant = 'primary',
  colorScheme = 'yellow',
  fullWidth = false,
  className = '',
  ...props
}: BrutalButtonProps) {
  const baseClass = variant === 'primary' ? 'brutal-btn' : 'brutal-btn-ghost'
  
  // Custom colors for primary variant if not yellow
  const colorClass = variant === 'primary' && colorScheme !== 'yellow' 
    ? `bg-[var(--neo-${colorScheme})] hover:bg-[var(--neo-${colorScheme})]`
    : ''
    
  const widthClass = fullWidth ? 'w-full' : ''

  return (
    <button
      className={`${baseClass} ${colorClass} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
