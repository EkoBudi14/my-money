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
                    className={`w-full px-[18px] py-[14px] pr-[80px] bg-white dark:bg-[var(--bg-elevated)] border-[3px] border-[var(--neo-ink)] rounded-[18px] shadow-[4px_4px_0_var(--neo-ink)] focus:outline-none transition-all font-[800] text-2xl tracking-wide ${className}`}
                    value={formatDisplay(value)}
                    onChange={handleChange}
                    autoFocus={autoFocus}
                />
                <div className="absolute right-2 top-2 bottom-2">
                    <button
                        type="button"
                        onClick={addThousands}
                        className="h-full px-3 bg-[var(--neo-yellow-vivid)] text-[var(--neo-ink)] border-[3px] border-[var(--neo-ink)] shadow-[2px_2px_0_var(--neo-ink)] rounded-[12px] font-[800] text-sm transition-transform flex items-center gap-1 active:translate-y-[2px] active:translate-x-[2px] active:shadow-[0px_0px_0_var(--neo-ink)]"
                        tabIndex={-1} // prevent auto focus on this button
                    >
                        +000
                    </button>
                </div>
            </div>
            {/* Helper label */}
            {value && parseInt(value) >= 1000000 && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-right">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(parseInt(value))}
                </p>
            )}
        </div>
    )
}
