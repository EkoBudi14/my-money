'use client'

/** Empty-state card (DESIGN-TAMBAHAN.md §6 / PolaState §1). */
export default function EmptyState({
    icon,
    title,
    text,
    actionLabel,
    onAction,
    actionVariant = 'primary',
    style,
}: {
    icon: React.ReactNode
    title: string
    text: string
    actionLabel?: string
    onAction?: () => void
    actionVariant?: 'primary' | 'secondary'
    style?: React.CSSProperties
}) {
    return (
        <div className="es" style={style}>
            <div className="ic">{icon}</div>
            <span className="t2">{title}</span>
            <p>{text}</p>
            {actionLabel && onAction && (
                <button
                    className={actionVariant === 'primary' ? 'btn' : 'btn-2'}
                    style={{ height: 40, fontSize: 13 }}
                    onClick={onAction}
                >
                    {actionLabel}
                </button>
            )}
        </div>
    )
}
