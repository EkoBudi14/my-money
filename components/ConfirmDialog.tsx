'use client'
import { useEffect, useState } from 'react'
import { Trash2, AlertTriangle, Check } from 'lucide-react'

export type ConfirmVariant = 'A' | 'B'
export type ConfirmTone = 'danger' | 'warn'

interface ConfirmDialogProps {
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    variant?: ConfirmVariant
    tone?: ConfirmTone
    details?: string[]
    checkLabel?: string
    onConfirm: () => void
    onCancel: () => void
    isOpen: boolean
}

export default function ConfirmDialog({
    title,
    message,
    confirmText = 'Hapus',
    cancelText = 'Batal',
    variant = 'A',
    tone = 'danger',
    details,
    checkLabel = 'Saya paham data ini tidak bisa dikembalikan',
    onConfirm,
    onCancel,
    isOpen,
}: ConfirmDialogProps) {
    const [checked, setChecked] = useState(false)

    // Reset the variant-B checkbox whenever the dialog opens.
    useEffect(() => {
        if (isOpen) setChecked(false)
    }, [isOpen])

    // Esc closes the dialog (counts as cancel).
    useEffect(() => {
        if (!isOpen) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [isOpen, onCancel])

    if (!isOpen) return null

    const Icon = tone === 'warn' ? AlertTriangle : Trash2
    const iconStyle =
        tone === 'warn'
            ? { background: 'var(--warn-tint)', color: 'var(--warn)' }
            : { background: 'var(--danger-tint)', color: 'var(--danger)' }
    const confirmDisabled = variant === 'B' && !checked

    return (
        <div className="cd dlg-wrap" onClick={onCancel}>
            <div
                className="dlg"
                role="alertdialog"
                aria-labelledby="cd-dlg-title"
                onClick={(e) => e.stopPropagation()}
            >
                {variant === 'A' ? (
                    <>
                        <div className="ic-l" style={iconStyle}><Icon className="i" /></div>
                        <div className="stack" style={{ gap: 4 }}>
                            <h3 className="h2" id="cd-dlg-title" style={{ fontSize: 17 }}>{title}</h3>
                            <p className="sub" style={{ fontSize: 14, lineHeight: 1.5 }}>{message}</p>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="stack" style={{ gap: 4 }}>
                            <h3 className="h2" id="cd-dlg-title" style={{ fontSize: 17 }}>{title}</h3>
                            <p className="sub" style={{ fontSize: 14, lineHeight: 1.5 }}>{message}</p>
                        </div>
                        {details && details.length > 0 && (
                            <div className="dlg-impact">
                                {details.map((d, i) => <span key={i}>• {d}</span>)}
                            </div>
                        )}
                        <button
                            type="button"
                            className="hstack"
                            style={{ fontSize: 13, fontWeight: 600, border: 0, background: 'none', padding: 0, textAlign: 'left', color: 'var(--text)' }}
                            onClick={() => setChecked((v) => !v)}
                            aria-pressed={checked}
                        >
                            <span className={`check ${checked ? 'on' : ''}`}>
                                {checked && <Check className="i i-s" />}
                            </span>
                            {checkLabel}
                        </button>
                    </>
                )}

                <div className="g2">
                    <button className="btn-2" onClick={onCancel} autoFocus>{cancelText}</button>
                    <button className="btn-danger" onClick={onConfirm} disabled={confirmDisabled}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}
