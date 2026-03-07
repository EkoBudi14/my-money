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
    accentColor: string
}> = {
    create: {
        icon: <Plus className="w-8 h-8 text-white" />,
        iconBg: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
        titleDefault: 'Berhasil Ditambahkan!',
        accentColor: 'from-emerald-500 to-emerald-600',
    },
    edit: {
        icon: <Pencil className="w-8 h-8 text-white" />,
        iconBg: 'bg-gradient-to-br from-blue-400 to-blue-600',
        titleDefault: 'Berhasil Diperbarui!',
        accentColor: 'from-blue-500 to-blue-600',
    },
    delete: {
        icon: <Trash2 className="w-8 h-8 text-white" />,
        iconBg: 'bg-gradient-to-br from-rose-400 to-rose-600',
        titleDefault: 'Berhasil Dihapus!',
        accentColor: 'from-rose-500 to-rose-600',
    },
    general: {
        icon: <CheckCircle className="w-8 h-8 text-white" />,
        iconBg: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
        titleDefault: 'Berhasil!',
        accentColor: 'from-emerald-500 to-emerald-600',
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
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                onClick={onClose}
                style={{ animation: 'fadeIn 0.2s ease-out' }}
            />

            {/* Modal Card */}
            <div
                className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
                style={{ animation: 'successModalIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            >
                {/* Top accent bar */}
                <div className={`h-1.5 w-full bg-gradient-to-r ${config.accentColor}`} />

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Content */}
                <div className="flex flex-col items-center text-center px-8 pt-8 pb-8">
                    {/* Animated Icon */}
                    <div className="relative mb-5">
                        {/* Ripple rings */}
                        <div className={`absolute inset-0 rounded-full ${config.iconBg} opacity-20`}
                            style={{ animation: 'ripple 1.2s ease-out infinite', transform: 'scale(1.6)' }} />
                        <div className={`absolute inset-0 rounded-full ${config.iconBg} opacity-10`}
                            style={{ animation: 'ripple 1.2s ease-out 0.3s infinite', transform: 'scale(2.2)' }} />

                        {/* Icon circle */}
                        <div className={`relative w-20 h-20 rounded-full ${config.iconBg} flex items-center justify-center shadow-lg`}
                            style={{ animation: 'iconPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both' }}>
                            {config.icon}
                        </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-slate-800 mb-2"
                        style={{ animation: 'slideUp 0.3s ease-out 0.2s both' }}>
                        {title || config.titleDefault}
                    </h3>

                    {/* Message */}
                    <p className="text-slate-500 text-sm leading-relaxed mb-6"
                        style={{ animation: 'slideUp 0.3s ease-out 0.25s both' }}>
                        {message}
                    </p>

                    {/* OK Button */}
                    <button
                        onClick={onClose}
                        className={`w-full py-3 px-6 bg-gradient-to-r ${config.accentColor} text-white font-semibold rounded-xl shadow-md hover:opacity-90 active:scale-[0.98] transition-all`}
                        style={{ animation: 'slideUp 0.3s ease-out 0.3s both' }}
                    >
                        Oke, Mengerti!
                    </button>

                    {/* Auto-close progress bar */}
                    <div className="w-full mt-4 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full bg-gradient-to-r ${config.accentColor} rounded-full`}
                            style={{
                                animation: `progressBar ${duration}ms linear forwards`,
                                transformOrigin: 'left'
                            }}
                        />
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">Menutup otomatis...</p>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes successModalIn {
                    from { opacity: 0; transform: scale(0.7) translateY(20px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes iconPop {
                    from { opacity: 0; transform: scale(0.4); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes ripple {
                    0% { opacity: 0.3; transform: scale(1.2); }
                    100% { opacity: 0; transform: scale(2.5); }
                }
                @keyframes progressBar {
                    from { transform: scaleX(1); }
                    to { transform: scaleX(0); }
                }
            `}</style>
        </div>
    )
}
