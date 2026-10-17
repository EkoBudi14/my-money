'use client'
import { AlertCircle } from 'lucide-react'

/** Inline field validation message (DESIGN-TAMBAHAN.md §5). Render under the field. */
export default function FieldError({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    if (!children) return null
    return (
        <span className="err" style={style}>
            <AlertCircle className="i i-s" />
            <span>{children}</span>
        </span>
    )
}
