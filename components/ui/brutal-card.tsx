import React from 'react'

export interface BrutalCardProps extends React.HTMLAttributes<HTMLDivElement> {
  colorScheme?: 'yellow' | 'mint' | 'sky' | 'peach' | 'pink' | 'lav' | 'white'
  size?: 'sm' | 'md' | 'lg'
  tight?: boolean
}

export function BrutalCard({
  children,
  colorScheme = 'white',
  size = 'lg',
  tight = false,
  className = '',
  ...props
}: BrutalCardProps) {
  const sizeClass = size === 'lg' ? 'brutal-card' : size === 'md' ? 'brutal-card-md' : 'brutal-card-sm'
  const colorClass = colorScheme !== 'white' ? `brutal-card-${colorScheme}` : ''
  const paddingClass = tight ? 'p-4' : 'p-6'

  return (
    <div
      className={`${sizeClass} ${colorClass} ${paddingClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
