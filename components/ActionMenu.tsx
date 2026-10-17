'use client'
import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'

export interface ActionItem {
    key: string
    label: string
    icon?: React.ReactNode
    danger?: boolean
    onClick: () => void
}

export interface SheetHeader {
    icon?: React.ReactNode
    title: string
    subtitle?: string
}

/** Controlled bottom sheet of actions (mobile). DESIGN-TAMBAHAN.md §7. */
export function ActionSheet({
    isOpen,
    onClose,
    header,
    items,
}: {
    isOpen: boolean
    onClose: () => void
    header?: SheetHeader
    items: ActionItem[]
}) {
    useEffect(() => {
        if (!isOpen) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [isOpen, onClose])

    if (!isOpen) return null
    return (
        <div className="cd">
            <div className="scrim" onClick={onClose} />
            <div className="sheet" style={{ gap: 6, paddingBottom: 20 }} role="menu">
                <div className="grabber" />
                {header && (
                    <div className="sheet-head">
                        {header.icon}
                        <div>
                            <div className="t">{header.title}</div>
                            {header.subtitle && <div className="meta">{header.subtitle}</div>}
                        </div>
                    </div>
                )}
                {items.map((it) => (
                    <button
                        key={it.key}
                        role="menuitem"
                        className={`sheet-item ${it.danger ? 'danger' : ''}`}
                        onClick={() => { onClose(); it.onClick() }}
                    >
                        {it.icon}{it.label}
                    </button>
                ))}
            </div>
        </div>
    )
}

/** Web dropdown menu (⋯ trigger). DESIGN-TAMBAHAN.md §7. */
export function DropdownMenu({
    items,
    ariaLabel = 'Opsi',
}: {
    items: ActionItem[]
    ariaLabel?: string
}) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        const onDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
        window.addEventListener('mousedown', onDown)
        window.addEventListener('keydown', onKey)
        return () => {
            window.removeEventListener('mousedown', onDown)
            window.removeEventListener('keydown', onKey)
        }
    }, [open])

    return (
        <div className="menu-anchor" ref={ref}>
            <button className="icon-btn ghost" aria-label={ariaLabel} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
                <MoreHorizontal className="i" />
            </button>
            {open && (
                <div className="menu-pop">
                    <div className="menu" role="menu">
                        {items.map((it, i) => {
                            const prevDanger = i > 0 && !items[i - 1].danger && it.danger
                            return (
                                <div key={it.key} style={{ display: 'contents' }}>
                                    {prevDanger && <hr />}
                                    <button
                                        role="menuitem"
                                        className={it.danger ? 'danger' : ''}
                                        onClick={() => { setOpen(false); it.onClick() }}
                                    >
                                        {it.icon}{it.label}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
