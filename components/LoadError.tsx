'use client'
import { AlertCircle, RotateCw } from 'lucide-react'

/** Load-error card (DESIGN-TAMBAHAN.md §6 / PolaState §3). Replaces the list body only. */
export default function LoadError({
    title,
    text = 'Periksa koneksi internet, lalu coba lagi.',
    onRetry,
    style,
}: {
    title: string
    text?: string
    onRetry?: () => void
    style?: React.CSSProperties
}) {
    return (
        <div className="es" style={style}>
            <div className="ic danger"><AlertCircle className="i" /></div>
            <span className="t2">{title}</span>
            <p>{text}</p>
            {onRetry && (
                <button className="btn-2" style={{ height: 40, fontSize: 13 }} onClick={onRetry}>
                    <RotateCw className="i i-s" />Coba lagi
                </button>
            )}
        </div>
    )
}
