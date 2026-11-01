'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
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
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const DROPDOWN_HEIGHT = 260 // approx max-h-60 + padding

  // Find selected option
  const selectedOption = options.find(opt => opt.value === value)

  // Position the portaled menu against the trigger; open upward when space below is short.
  // Portaled + fixed so scrollable parents (e.g. .sheet with overflow-y:auto) can't clip it.
  const updatePosition = useCallback(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const up = spaceBelow < DROPDOWN_HEIGHT && rect.top > spaceBelow
    setPos(up
      ? { left: rect.left, width: rect.width, bottom: window.innerHeight - rect.top + 8 }
      : { left: rect.left, width: rect.width, top: rect.bottom + 8 })
  }, [])

  useEffect(() => {
    if (!isOpen) return
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen, updatePosition])

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const t = event.target as Node
      if (containerRef.current?.contains(t) || popRef.current?.contains(t)) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative w-full" ref={containerRef} style={style}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
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
      {isOpen && pos && createPortal(
        <div ref={popRef} className="nsel-pop overflow-hidden" role="listbox"
          style={{ position: 'fixed', zIndex: 100, left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom }}>
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
        </div>,
        // Portal into the nearest .cd root so the theme CSS variables still apply.
        (containerRef.current?.closest('.cd') as HTMLElement | null) ?? document.body
      )}
    </div>
  )
}
