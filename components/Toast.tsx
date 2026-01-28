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
                    bg: 'bg-emerald-50 border-emerald-200',
                    icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
                    text: 'text-emerald-800'
                }
            case 'error':
                return {
                    bg: 'bg-rose-50 border-rose-200',
                    icon: <XCircle className="w-5 h-5 text-rose-600" />,
                    text: 'text-rose-800'
                }
            case 'warning':
                return {
                    bg: 'bg-amber-50 border-amber-200',
                    icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
                    text: 'text-amber-800'
                }
            case 'info':
                return {
                    bg: 'bg-blue-50 border-blue-200',
                    icon: <Info className="w-5 h-5 text-blue-600" />,
                    text: 'text-blue-800'
                }
        }
    }

    const styles = getToastStyles()

    return (
        <div
            className={`${styles.bg} border rounded-xl shadow-lg p-4 mb-3 flex items-start gap-3 min-w-[320px] max-w-md animate-in slide-in-from-right-5 fade-in duration-300`}
        >
            <div className="flex-shrink-0">{styles.icon}</div>
            <p className={`flex-1 text-sm font-medium ${styles.text}`}>{toast.message}</p>
            <button
                onClick={() => onClose(toast.id)}
                className={`flex-shrink-0 ${styles.text} opacity-50 hover:opacity-100 transition-opacity`}
            >
                <X className="w-4 h-4" />
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
