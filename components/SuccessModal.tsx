'use client'
import { useEffect } from 'react'
import { CheckCircle, Trash2, Pencil, Plus } from 'lucide-react'

export type SuccessModalType = 'create' | 'edit' | 'delete' | 'general'

export interface SuccessModalOptions {
    type: SuccessModalType
    title?: string
    message: string
    duration?: number
}

interface SuccessModalProps extends SuccessModalOptions {
    isOpen: boolean
    onClose: () => void
}

const typeConfig: Record<SuccessModalType, {
    icon: React.ReactNode
    tint: string
    color: string
    titleDefault: string
}> = {
    create: {
        icon: <Plus className="i i-l" />,
        tint: 'var(--accent-tint)', color: 'var(--accent)',
        titleDefault: 'Berhasil ditambahkan',
    },
    edit: {
        icon: <Pencil className="i i-l" />,
        tint: 'var(--accent-tint)', color: 'var(--accent)',
        titleDefault: 'Berhasil diperbarui',
    },
    delete: {
        icon: <Trash2 className="i i-l" />,
        tint: 'var(--danger-tint)', color: 'var(--danger)',
        titleDefault: 'Berhasil dihapus',
    },
    general: {
        icon: <CheckCircle className="i i-l" />,
        tint: 'var(--income-tint)', color: 'var(--income)',
        titleDefault: 'Berhasil',
    },
}

export default function SuccessModal({ isOpen, onClose, type, title, message, duration = 2500 }: SuccessModalProps) {
    const config = typeConfig[type]

    useEffect(() => {
        if (!isOpen) return
        const timer = setTimeout(() => {
            onClose()
        }, duration)
        return () => clearTimeout(timer)
    }, [isOpen, duration, onClose])

    if (!isOpen) return null

    return (
        <div className="cd dlg-wrap" onClick={onClose} style={{ zIndex: 9999 }}>
            <div
                className="dlg"
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: 360, alignItems: 'center', textAlign: 'center' }}
            >
                <div
                    className="ic-l"
                    style={{ width: 72, height: 72, borderRadius: '50%', background: config.tint, color: config.color, alignSelf: 'center' }}
                >
                    {config.icon}
                </div>

                <h2 className="h2">{title || config.titleDefault}</h2>
                <p className="sub" style={{ textAlign: 'center' }}>{message}</p>

                <button className="btn btn-block" onClick={onClose}>Oke, mengerti</button>

                <div className="bar" style={{ width: '100%' }}>
                    <div style={{ animation: `successBar ${duration}ms linear forwards`, transformOrigin: 'left', background: config.color }} />
                </div>
                <span className="lbl">Menutup otomatis…</span>
            </div>

            <style>{`@keyframes successBar{from{transform:scaleX(1)}to{transform:scaleX(0)}}`}</style>
        </div>
    )
}
