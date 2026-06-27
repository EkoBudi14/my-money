'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

export interface NeoSelectOption {
  value: string
  label: string
  disabled?: boolean
  icon?: React.ReactNode
}

interface NeoSelectProps {
  options: NeoSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  required?: boolean
}

export default function NeoSelect({
  options,
  value,
  onChange,
  placeholder = 'Pilih...',
  className = '',
  required
}: NeoSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Find selected option
  const selectedOption = options.find(opt => opt.value === value)

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full text-left outline-none transition-all ${className}`}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon && (
            <span className="shrink-0">{selectedOption.icon}</span>
          )}
          <span className={`truncate ${!selectedOption ? 'opacity-70' : ''}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Hidden input for form validation if required */}
      {required && (
        <input
          type="text"
          className="absolute opacity-0 w-0 h-0 p-0 m-0 border-0 pointer-events-none"
          tabIndex={-1}
          value={value}
          onChange={() => {}}
          required={required}
        />
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-[var(--bg-card)] border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] rounded-[12px] overflow-hidden">
          <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col p-1 gap-1" style={{ willChange: 'scroll-position', transform: 'translateZ(0)' }}>
            {options.map((option, idx) => (
              <button
                key={`${option.value}-${idx}`}
                type="button"
                disabled={option.disabled}
                onClick={() => {
                  if (!option.disabled) {
                    onChange(option.value)
                    setIsOpen(false)
                  }
                }}
                className={`flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-[8px] border-2 border-transparent font-black text-sm transition-all
                  ${option.disabled 
                    ? 'opacity-50 cursor-not-allowed bg-[var(--bg-elevated)] text-[var(--text-muted)]' 
                    : value === option.value 
                      ? 'bg-[var(--neo-yellow)] border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] text-[var(--neo-ink)]' 
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--neo-ink)] hover:text-[var(--neo-ink)]'
                  }
                `}
              >
                {option.icon && (
                  <span className="shrink-0">{option.icon}</span>
                )}
                <span className="truncate">{option.label}</span>
              </button>
            ))}
            
            {options.length === 0 && (
              <div className="p-4 text-center text-sm font-bold text-[var(--text-muted)]">
                Tidak ada opsi tersedia
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
