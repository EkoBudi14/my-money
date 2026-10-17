'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
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
  style?: React.CSSProperties;
}

export default function NeoSelect({
  options,
  value,
  onChange,
  placeholder = 'Pilih...',
  className = '',
  required,
  style
}: NeoSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const DROPDOWN_HEIGHT = 260 // approx max-h-60 + padding

  // Find selected option
  const selectedOption = options.find(opt => opt.value === value)

  // Detect if dropdown should open upward (dropup)
  const checkDropDirection = useCallback(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    setDropUp(spaceBelow < DROPDOWN_HEIGHT)
  }, [])

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
    <div className="relative w-full" ref={containerRef} style={style}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          checkDropDirection()
          setIsOpen(!isOpen)
        }}
        className={`flex items-center justify-between w-full text-left outline-none transition-all ${className || 'input'}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon && (
            <span className="shrink-0">{selectedOption.icon}</span>
          )}
          <span className={`truncate ${!selectedOption ? 'opacity-70' : ''}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown style={{ color: 'var(--text-2)' }} className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
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
        <div className={`nsel-pop absolute z-50 left-0 right-0 overflow-hidden ${dropUp ? 'bottom-full mb-2' : 'top-full mt-2'}`} role="listbox">
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
                role="option"
                aria-selected={value === option.value}
                className={`nsel-opt flex items-center gap-2 w-full text-left ${option.disabled ? 'off' : value === option.value ? 'on' : ''}`}
              >
                {option.icon && (
                  <span className="shrink-0">{option.icon}</span>
                )}
                <span className="truncate">{option.label}</span>
              </button>
            ))}
            
            {options.length === 0 && (
              <div className="p-4 text-center text-sm" style={{ color: 'var(--text-2)' }}>
                Tidak ada opsi tersedia
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
