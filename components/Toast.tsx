'use client'
import { useEffect } from 'react'
import { Check, AlertTriangle, Info } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastAction {
    label: string
    onClick: () => void
}

export interface Toast {
    id: string
    type: ToastType
    message: string
    duration?: number
    action?: ToastAction
}

interface ToastItemProps {
    toast: Toast
    onClose: (id: string) => void
}

// Error icon reused for the error pill (circle with "i").
const ErrorIcon = () => (
    <svg className="i ti" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" />
    </svg>
)

const ToastItem = ({ toast, onClose }: ToastItemProps) => {
    const defaultDuration = toast.type === 'error' ? 6000 : 4000

    useEffect(() => {
        const timer = setTimeout(() => onClose(toast.id), toast.duration ?? defaultDuration)
        return () => clearTimeout(timer)
    }, [toast.id, toast.duration, defaultDuration, onClose])

    const pillClass = toast.type === 'error' ? 't-err' : toast.type === 'warning' ? 't-warn' : ''
    const role = toast.type === 'error' ? 'alert' : 'status'

    const icon =
        toast.type === 'error' ? <ErrorIcon /> :
        toast.type === 'warning' ? <AlertTriangle className="i ti" /> :
        toast.type === 'info' ? <Info className="i ti" /> :
        <Check className="i ti" />

    return (
        <div className={`toast ${pillClass}`} role={role}>
            {icon}
            <span>{toast.message}</span>
            {toast.action && (
                <button
                    className="act"
                    onClick={() => { toast.action!.onClick(); onClose(toast.id) }}
                >
                    {toast.action.label}
                </button>
            )}
        </div>
    )
}

interface ToastContainerProps {
    toasts: Toast[]
    onClose: (id: string) => void
}

export default function ToastContainer({ toasts, onClose }: ToastContainerProps) {
    if (toasts.length === 0) return null
    return (
        <div className="cd toast-wrap">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onClose={onClose} />
            ))}
        </div>
    )
}
