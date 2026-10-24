'use client'
import { Plus } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'

interface MoneyInputProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    autoFocus?: boolean
    className?: string
}

export default function MoneyInput({ value, onChange, placeholder = '0', autoFocus = false, className = '' }: MoneyInputProps) {

    const inputRef = useRef<HTMLInputElement>(null)
    const [cursorData, setCursorData] = useState<{ digitsBeforeCaret: number } | null>(null)

    // Format display value: 10000 -> 10.000
    const formatDisplay = (val: string) => {
        if (!val) return ''
        const num = parseInt(val, 10)
        if (isNaN(num)) return ''
        return num.toLocaleString('id-ID')
    }

    // Handle input change: Remove non-digits
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target
        const caretPosition = input.selectionStart || 0
        const previousValue = input.value

        // Count how many literal digits exist before the caret
        const nonDigitsBeforeCaret = (previousValue.slice(0, caretPosition).match(/\D/g) || []).length
        const digitsBeforeCaret = caretPosition - nonDigitsBeforeCaret

        setCursorData({ digitsBeforeCaret })

        const raw = previousValue.replace(/\D/g, '')
        onChange(raw)
    }

    useEffect(() => {
        if (cursorData !== null && inputRef.current) {
            const displayStr = inputRef.current.value
            let newCaret = 0
            let digitsSeen = 0

            for (let i = 0; i < displayStr.length; i++) {
                if (digitsSeen === cursorData.digitsBeforeCaret) {
                    break
                }
                if (/\d/.test(displayStr[i])) {
                    digitsSeen++
                }
                newCaret++
            }

            inputRef.current.setSelectionRange(newCaret, newCaret)
        }
    }, [value, cursorData])

    const addThousands = () => {
        if (!value) return onChange('1000') // If empty, start with 1000
        onChange(value + '000')
    }

    return (
        <div style={{ position: 'relative' }}>
            <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                placeholder={placeholder}
                className={`input ${className}`}
                style={{ fontWeight: 700, fontSize: 18, paddingRight: 68, letterSpacing: '.2px' }}
                value={formatDisplay(value)}
                onChange={handleChange}
                autoFocus={autoFocus}
            />
            <button
                type="button"
                onClick={addThousands}
                className="chip"
                style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', height: 32, gap: 2 }}
                tabIndex={-1} // prevent auto focus on this button
            >
                <Plus className="i i-s" />000
            </button>
        </div>
    )
}
