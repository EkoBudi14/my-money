'use client'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    onConfirm: () => void
    onCancel: () => void
    isOpen: boolean
}

export default function ConfirmDialog({
    title,
    message,
    confirmText = 'Ya, Lanjutkan',
    cancelText = 'Batal',
    onConfirm,
    onCancel,
    isOpen
}: ConfirmDialogProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onCancel}
            ></div>

            <div className="bg-[var(--bg-card)] border-[3px] border-[var(--neo-ink)] shadow-[8px_8px_0_var(--neo-ink)] w-full max-w-md rounded-[16px] z-50 p-6 relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 flex items-center justify-center p-1.5 rounded-xl bg-[#ffd84d] border-2 border-[#141414] shadow-[2px_2px_0_#141414] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#141414] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
                >
                    <X className="w-5 h-5 text-[#141414]" strokeWidth={3} />
                </button>

                <div className="flex flex-col items-center text-center mt-2">
                    <div className="w-16 h-16 bg-[var(--neo-yellow-vivid)] border-[3px] border-[var(--neo-ink)] shadow-[4px_4px_0_var(--neo-ink)] rounded-[12px] flex items-center justify-center mb-6">
                        <AlertTriangle className="w-8 h-8 text-[var(--neo-ink)] stroke-[2.5px]" />
                    </div>

                    <h3 className="text-xl font-black text-[var(--neo-ink)] mb-2 tracking-tight">{title}</h3>
                    <p className="text-[var(--neo-ink)] opacity-80 font-bold mb-8">{message}</p>

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-6 py-3 brutal-btn bg-white text-[var(--neo-ink)]"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 px-6 py-3 brutal-btn bg-rose-300 text-[var(--neo-ink)]"
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
