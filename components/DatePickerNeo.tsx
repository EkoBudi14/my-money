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
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; minWidth: number; flipUp: boolean }>({
    top: 0, left: 0, minWidth: 280, flipUp: false
  })
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
        onClick={() => {
          if (!isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect()
            const calendarWidth = 280
            const calendarHeight = 360 // perkiraan tinggi kalender
            const spaceBelow = window.innerHeight - rect.bottom
            const spaceRight = window.innerWidth - rect.left
            const flipUp = spaceBelow < calendarHeight && rect.top > calendarHeight
            const left = spaceRight < calendarWidth ? Math.max(8, rect.right - calendarWidth) : rect.left
            setDropdownPos({
              top: flipUp ? rect.top - calendarHeight - 8 : rect.bottom + 8,
              left,
              minWidth: rect.width,
              flipUp
            })
          }
          setIsOpen(!isOpen)
        }}
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

      {/* Dropdown Calendar — catatduit style, fixed position to escape parent overflow */}
      {isOpen && (
        <div
          className="cd"
          style={{
            position: 'fixed', zIndex: 9999, width: 280,
            top: dropdownPos.top, left: dropdownPos.left,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 16, boxShadow: '0 8px 24px rgba(15,31,28,.12)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 10, borderBottom: '1px solid var(--divider)' }}>
            <button type="button" onClick={handlePrevMonth} className="icon-btn" style={{ width: 34, height: 34, borderRadius: 10 }} aria-label="Bulan sebelumnya">
              <ChevronLeft className="i i-s" />
            </button>
            <div style={{ display: 'flex', gap: 6 }}>
              <select
                className="input"
                style={{ height: 34, width: 'auto', padding: '0 8px', fontSize: 13, fontWeight: 600 }}
                value={currentDate.getMonth()}
                onChange={(e) => setCurrentDate(new Date(currentDate.getFullYear(), parseInt(e.target.value), 1))}
              >
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select
                className="input"
                style={{ height: 34, width: 'auto', padding: '0 8px', fontSize: 13, fontWeight: 600 }}
                value={currentDate.getFullYear()}
                onChange={(e) => setCurrentDate(new Date(parseInt(e.target.value), currentDate.getMonth(), 1))}
              >
                {Array.from({ length: 121 }, (_, i) => new Date().getFullYear() - 100 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={handleNextMonth} className="icon-btn" style={{ width: 34, height: 34, borderRadius: 10 }} aria-label="Bulan berikutnya">
              <ChevronRight className="i i-s" />
            </button>
          </div>

          {/* Grid */}
          <div style={{ padding: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 4, marginBottom: 6 }}>
              {DAYS.map(day => (
                <div key={day} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-2)' }}>
                  {day}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 4 }}>
              {calendarGrid.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} style={{ height: 34 }} />
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
                    style={{
                      height: 34, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${isSelected || isToday ? 'var(--accent)' : 'transparent'}`,
                      background: isSelected ? 'var(--accent)' : isToday ? 'var(--accent-tint)' : 'transparent',
                      color: isSelected ? 'var(--on-accent)' : isToday ? 'var(--accent-hover)' : 'var(--text)',
                    }}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--divider)' }}>
              <button type="button" onClick={handleTodayClick} className="btn-2" style={{ width: '100%', height: 40 }}>
                Hari Ini
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
