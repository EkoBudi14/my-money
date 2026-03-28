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
        <div className="relative">
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    placeholder={placeholder}
                    className={`w-full p-4 pr-20 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-bold text-2xl tracking-wide ${className}`}
                    value={formatDisplay(value)}
                    onChange={handleChange}
                    autoFocus={autoFocus}
                />
                <div className="absolute right-2 top-2 bottom-2">
                    <button
                        type="button"
                        onClick={addThousands}
                        className="h-full px-3 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-xl font-bold text-sm transition-colors flex items-center gap-1 active:scale-95"
                        tabIndex={-1} // prevent auto focus on this button
                    >
                        +000
                    </button>
                </div>
            </div>
            {/* Helper label */}
            {value && parseInt(value) >= 1000000 && (
                <p className="text-xs text-slate-400 mt-1 text-right">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(parseInt(value))}
                </p>
            )}
        </div>
    )
}
