'use client'
import { useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
    id: string
    type: ToastType
    message: string
    duration?: number
}

interface ToastItemProps {
    toast: Toast
    onClose: (id: string) => void
}

const ToastItem = ({ toast, onClose }: ToastItemProps) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(toast.id)
        }, toast.duration || 3000)

        return () => clearTimeout(timer)
    }, [toast.id, toast.duration, onClose])

    const getToastStyles = () => {
        switch (toast.type) {
            case 'success':
                return {
                    bg: 'bg-[var(--neo-mint,#86efac)]',
                    icon: <CheckCircle className="w-6 h-6 text-[var(--neo-ink,#141414)] stroke-[2.5px]" />,
                    text: 'text-[var(--neo-ink,#141414)]'
                }
            case 'error':
                return {
                    bg: 'bg-[var(--neo-peach,#fca5a5)]',
                    icon: <XCircle className="w-6 h-6 text-[var(--neo-ink,#141414)] stroke-[2.5px]" />,
                    text: 'text-[var(--neo-ink,#141414)]'
                }
            case 'warning':
                return {
                    bg: 'bg-[var(--neo-yellow-vivid,#ffd84d)]',
                    icon: <AlertTriangle className="w-6 h-6 text-[var(--neo-ink,#141414)] stroke-[2.5px]" />,
                    text: 'text-[var(--neo-ink,#141414)]'
                }
            case 'info':
                return {
                    bg: 'bg-[var(--neo-sky,#7dd3fc)]',
                    icon: <Info className="w-6 h-6 text-[var(--neo-ink,#141414)] stroke-[2.5px]" />,
                    text: 'text-[var(--neo-ink,#141414)]'
                }
        }
    }

    const styles = getToastStyles()

    return (
        <div
            className={`${styles.bg} border-[3px] border-[var(--neo-ink,#141414)] shadow-[4px_4px_0_var(--neo-ink,#141414)] rounded-[16px] p-4 mb-3 flex items-center gap-3 min-w-[320px] max-w-md animate-in slide-in-from-right-5 fade-in duration-300`}
        >
            <div className="flex-shrink-0">{styles.icon}</div>
            <p className={`flex-1 text-sm font-medium ${styles.text}`}>{toast.message}</p>
            <button
                onClick={() => onClose(toast.id)}
                className="flex-shrink-0 flex items-center justify-center p-1.5 rounded-xl bg-[#ffd84d] border-2 border-[#141414] shadow-[2px_2px_0_#141414] hover:-translate-y-[1px] hover:shadow-[3px_3px_0_#141414] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all ml-2"
            >
                <X className="w-4 h-4 text-[#141414]" strokeWidth={3} />
            </button>
        </div>
    )
}

interface ToastContainerProps {
    toasts: Toast[]
    onClose: (id: string) => void
}

export default function ToastContainer({ toasts, onClose }: ToastContainerProps) {
    return (
        <div className="fixed top-6 right-6 z-[9999] pointer-events-none">
            <div className="pointer-events-auto">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onClose={onClose} />
                ))}
            </div>
        </div>
    )
}
