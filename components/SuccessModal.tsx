'use client'
import { useEffect } from 'react'
import { CheckCircle, Trash2, Pencil, Plus, X } from 'lucide-react'

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
    iconBg: string
    titleDefault: string
}> = {
    create: {
        icon: <Plus className="w-10 h-10 text-[var(--neo-ink)]" strokeWidth={4} />,
        iconBg: 'bg-[var(--neo-mint)]',
        titleDefault: 'Berhasil Ditambahkan!',
    },
    edit: {
        icon: <Pencil className="w-10 h-10 text-[var(--neo-ink)]" strokeWidth={3} />,
        iconBg: 'bg-[var(--neo-sky)]',
        titleDefault: 'Berhasil Diperbarui!',
    },
    delete: {
        icon: <Trash2 className="w-10 h-10 text-[var(--neo-ink)]" strokeWidth={3} />,
        iconBg: 'bg-[var(--neo-peach)]',
        titleDefault: 'Berhasil Dihapus!',
    },
    general: {
        icon: <CheckCircle className="w-10 h-10 text-[var(--neo-ink)]" strokeWidth={3} />,
        iconBg: 'bg-[var(--neo-yellow-vivid)]',
        titleDefault: 'Berhasil!',
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
                style={{ animation: 'fadeIn 0.2s ease-out' }}
            />

            {/* Modal Card */}
            <div
                className="relative w-full max-w-sm bg-[var(--bg-card)] rounded-[24px] border-[4px] border-[var(--neo-ink)] shadow-[8px_8px_0_var(--neo-ink)] overflow-hidden"
                style={{ animation: 'successModalIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 flex items-center justify-center p-1.5 rounded-[12px] bg-[var(--neo-yellow-vivid)] border-[3px] border-[var(--neo-ink)] shadow-[3px_3px_0_var(--neo-ink)] hover:-translate-y-[2px] hover:shadow-[5px_5px_0_var(--neo-ink)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all z-10"
                >
                    <X className="w-4 h-4 text-[var(--neo-ink)]" strokeWidth={4} />
                </button>

                {/* Content */}
                <div className="flex flex-col items-center text-center px-8 pt-10 pb-8">
                    {/* Animated Icon */}
                    <div className="relative mb-6">
                        <div className={`relative w-24 h-24 rounded-full ${config.iconBg} border-[4px] border-[var(--neo-ink)] shadow-[6px_6px_0_var(--neo-ink)] flex items-center justify-center`}
                            style={{ animation: 'iconPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both' }}>
                            {config.icon}
                        </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-black uppercase tracking-tight text-[var(--text-primary)] mb-2"
                        style={{ animation: 'slideUp 0.3s ease-out 0.2s both' }}>
                        {title || config.titleDefault}
                    </h3>

                    {/* Message */}
                    <p className="text-[var(--text-secondary)] text-sm font-bold leading-relaxed mb-8"
                        style={{ animation: 'slideUp 0.3s ease-out 0.25s both' }}>
                        {message}
                    </p>

                    {/* OK Button */}
                    <button
                        onClick={onClose}
                        className={`w-full py-4 px-6 ${config.iconBg} text-[var(--neo-ink)] font-black uppercase tracking-widest border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] hover:-translate-y-[2px] hover:shadow-[6px_6px_0_var(--neo-ink)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none rounded-[16px] transition-all`}
                        style={{ animation: 'slideUp 0.3s ease-out 0.3s both' }}
                    >
                        Oke, Mengerti!
                    </button>

                    {/* Auto-close progress bar */}
                    <div className="w-full mt-6 h-3 bg-[var(--bg-elevated)] border-2 border-[var(--neo-ink)] shadow-[inset_0_2px_0_rgba(0,0,0,0.1)] rounded-full overflow-hidden">
                        <div
                            className={`h-full ${config.iconBg} border-r-2 border-[var(--neo-ink)]`}
                            style={{
                                animation: `progressBar ${duration}ms linear forwards`,
                                transformOrigin: 'left'
                            }}
                        />
                    </div>
                    <p className="text-xs font-black uppercase text-[var(--text-secondary)] mt-2 tracking-widest">Menutup otomatis...</p>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes successModalIn {
                    from { opacity: 0; transform: scale(0.8) translateY(30px) rotate(-2deg); }
                    to { opacity: 1; transform: scale(1) translateY(0) rotate(0deg); }
                }
                @keyframes iconPop {
                    from { opacity: 0; transform: scale(0.2) rotate(-15deg); }
                    to { opacity: 1; transform: scale(1) rotate(0deg); }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes progressBar {
                    from { transform: scaleX(1); }
                    to { transform: scaleX(0); }
                }
            `}</style>
        </div>
    )
}
