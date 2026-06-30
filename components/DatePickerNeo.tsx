'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'

interface DatePickerNeoProps {
  value: string
  onChange: (e: { target: { value: string } }) => void
  required?: boolean
  className?: string
  style?: React.CSSProperties
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

export default function DatePickerNeo({
  value,
  onChange,
  required,
  className = '',
  style
}: DatePickerNeoProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Parse initial value (expected YYYY-MM-DD)
  const [currentDate, setCurrentDate] = useState(() => {
    if (value) {
      const parts = value.split('-')
      if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1)
      }
    }
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  })

  // Selected date object
  const selectedDateObj = useMemo(() => {
    if (!value) return null
    const parts = value.split('-')
    if (parts.length === 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
    }
    return null
  }, [value])

  const today = new Date()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Sync currentDate when value changes externally, but only if it's a valid date and we are not open
  useEffect(() => {
    if (value && !isOpen) {
      const parts = value.split('-')
      if (parts.length === 3) {
        setCurrentDate(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1))
      }
    }
  }, [value, isOpen])

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleDateClick = (day: number) => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() + 1
    const formattedMonth = month < 10 ? `0${month}` : month
    const formattedDay = day < 10 ? `0${day}` : day
    const newValue = `${year}-${formattedMonth}-${formattedDay}`
    
    // Simulate native event
    onChange({ target: { value: newValue } })
    setIsOpen(false)
  }

  const handleTodayClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const year = today.getFullYear()
    const month = today.getMonth() + 1
    const day = today.getDate()
    const formattedMonth = month < 10 ? `0${month}` : month
    const formattedDay = day < 10 ? `0${day}` : day
    const newValue = `${year}-${formattedMonth}-${formattedDay}`
    
    setCurrentDate(new Date(year, today.getMonth(), 1))
    onChange({ target: { value: newValue } })
    setIsOpen(false)
  }

  const calendarGrid = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const grid: (number | null)[] = []
    
    // Fill empty slots before first day
    for (let i = 0; i < firstDay; i++) {
      grid.push(null)
    }
    
    // Fill days
    for (let i = 1; i <= daysInMonth; i++) {
      grid.push(i)
    }

    return grid
  }, [currentDate])

  const displayDate = selectedDateObj 
    ? `${selectedDateObj.getDate()} ${MONTHS[selectedDateObj.getMonth()]} ${selectedDateObj.getFullYear()}`
    : 'Pilih Tanggal'

  return (
    <div className="relative w-full" ref={containerRef} style={style}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full text-left outline-none transition-all ${className}`}
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className="w-4 h-4 shrink-0 text-inherit opacity-70" />
          <span className={`truncate ${!value ? 'opacity-70' : ''}`}>
            {displayDate}
          </span>
        </div>
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

      {/* Dropdown Calendar */}
      {isOpen && (
        <div className="absolute z-[100] top-full left-0 mt-2 w-[280px] bg-[var(--bg-card)] border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] rounded-[16px] overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between p-3 bg-[var(--neo-yellow)] border-b-[3px] border-[var(--neo-ink)]">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] bg-white hover:-translate-y-[1px] hover:shadow-[3px_3px_0_var(--neo-ink)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
            >
              <ChevronLeft className="w-4 h-4 text-[var(--neo-ink)]" strokeWidth={3} />
            </button>
            <div className="flex items-center gap-1.5">
              <select 
                className="bg-white border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[8px] px-1.5 py-1 font-black text-[var(--neo-ink)] text-xs cursor-pointer outline-none hover:-translate-y-[1px] hover:shadow-[3px_3px_0_var(--neo-ink)] transition-all"
                value={currentDate.getMonth()}
                onChange={(e) => setCurrentDate(new Date(currentDate.getFullYear(), parseInt(e.target.value), 1))}
              >
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              
              <select 
                className="bg-white border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[8px] px-1.5 py-1 font-black text-[var(--neo-ink)] text-xs cursor-pointer outline-none hover:-translate-y-[1px] hover:shadow-[3px_3px_0_var(--neo-ink)] transition-all"
                value={currentDate.getFullYear()}
                onChange={(e) => setCurrentDate(new Date(parseInt(e.target.value), currentDate.getMonth(), 1))}
              >
                {Array.from({ length: 121 }, (_, i) => new Date().getFullYear() - 100 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] bg-white hover:-translate-y-[1px] hover:shadow-[3px_3px_0_var(--neo-ink)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
            >
              <ChevronRight className="w-4 h-4 text-[var(--neo-ink)]" strokeWidth={3} />
            </button>
          </div>

          {/* Grid */}
          <div className="p-3 bg-white dark:bg-[var(--bg-card)]">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map(day => (
                <div key={day} className="text-center text-[10px] font-black uppercase text-[var(--text-muted)]">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {calendarGrid.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="h-8" />
                }

                const isSelected = selectedDateObj && 
                  selectedDateObj.getDate() === day && 
                  selectedDateObj.getMonth() === currentDate.getMonth() &&
                  selectedDateObj.getFullYear() === currentDate.getFullYear()

                const isToday = day === today.getDate() && 
                  currentDate.getMonth() === today.getMonth() &&
                  currentDate.getFullYear() === today.getFullYear()

                return (
                  <button
                    key={`day-${day}`}
                    type="button"
                    onClick={() => handleDateClick(day)}
                    className={`
                      h-8 w-8 flex items-center justify-center rounded-[8px] text-xs font-black transition-all
                      ${isSelected 
                        ? 'bg-[var(--neo-ink)] text-[var(--neo-yellow)] scale-110 shadow-[2px_2px_0_var(--neo-ink)] border-2 border-[var(--neo-ink)] z-10' 
                        : isToday 
                          ? 'bg-[var(--neo-peach)] border-2 border-[var(--neo-ink)] text-[var(--neo-ink)]'
                          : 'text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:border-2 hover:border-[var(--neo-ink)]'
                      }
                    `}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
            
            <div className="mt-3 pt-3 border-t-2 border-dashed border-[var(--border-default)]">
              <button
                type="button"
                onClick={handleTodayClick}
                className="w-full py-2 text-center text-xs font-black uppercase tracking-wider text-[var(--text-primary)] bg-[var(--bg-elevated)] border-2 border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[8px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_var(--neo-ink)] active:translate-y-[1px] active:translate-x-[1px] active:shadow-none transition-all"
              >
                Hari Ini
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
